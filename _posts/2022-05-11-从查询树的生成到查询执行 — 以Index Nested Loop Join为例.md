---
title: 从查询树的生成到查询执行 — 以Index Nested Loop Join为例
tags: query
author: 胡梓锐
member: 胡梓锐
---

>  💡 **作者：华东师范大学 数据科学与工程学院 DBHammer项目组 东亚男儿团队**

本文主体面向对OceanBase数据库源码以及系统性能优化感兴趣的初学者供以技术交流，笔者来自[华东师范大学数据科学与工程学院DBHammer项目组](https://dbhammer.github.io/)。

在OceanBase数据库大赛的复赛阶段，我们需要对OceanBase 3.1版本的Nested Loop Join（下称NLJ）这一功能进行优化。因此，在这里我们以NLJ为例，简要介绍我们对OB从查询树的生成到查询执行的一些认识。文章主要从OB的基础代码组织逻辑、查询树的生成和查询执行三个方面进行介绍。

## OB的代码组织逻辑

在刚开始研读OB的代码时，OB简洁的代码风格让人印象深刻。一般而言，OB的函数返回值不是函数的处理结果，而是函数的执行状态。与之相对的，函数的处理结果会通过修改引用参数的方式向上传递。因此，通过分析每个函数的返回值，可以简单得知这个函数的执行流程。所以，在OB的代码中经常能看到类似的代码：

```cpp
 if (OB_FAIL(func_1)){
     logging
 } else (OB_FAIL(func_2)){
     logging
 } else (OB_SUCC(func_3)){
     logging
 }
```
{:.left}

这样的代码实际上相当于顺序执行func_1、func_2、func_3，并在函数执行失败/成功的时候输出日志信息，不继续执行剩下的函数。为了后续叙述的简洁，对于类似的代码，我们将省略函数执行失败的异常处理。

## 查询树的生成：以Index Nested Loop Join为例

在生成物理的查询树之前，OB会先生成逻辑的查询计划，然后根据这个逻辑的查询计划确定实际执行的物理计划。在NLJ中，最重要的就是join算子的生成，所以我们以join算子的生成为例介绍这一部分。

join算子的生成主要依赖于`ObStaticEngineCG::generate_join_spec(ObLogJoin& op, ObJoinSpec& spec)`函数。这一函数接收两个引用参数op和spec，op是join对应的逻辑计划，当有多个join条件时，op详细记录第一个join条件，并将其他的join条件存储在`other_join_conditions`里；spec是生成的物理执行计划。`generate_join_spec()`分为两个部分。在第一部分，它会处理首要的join条件，判断逻辑计划中首要的join条件的join类型，根据这个类型选择生成对应的物理计划。在第二部分，它遍历`other_join_conditions`，逐个调用接口函数生成物理执行计划。通过这种方式，OB能够自然地实现对逻辑计划的递归展开，从而构建出对应的物理执行树。我们对这一函数进行了整理和提取，抽象出其中的逻辑如下：

```cpp
 int ObStaticEngineCG::generate_join_spec(ObLogJoin& op, ObJoinSpec& spec)
 {
   int ret = OB_SUCCESS;
   bool is_late_mat = (phy_plan_->get_is_late_materialized() || op.is_late_mat());
   phy_plan_->set_is_late_materialized(is_late_mat);

   spec.join_type_ = op.get_join_type();
   if (MERGE_JOIN == op.get_join_algo()) {
       // 查询计划是merge join时的处理，暂略
   } else if (NESTED_LOOP_JOIN == op.get_join_algo()) {  // nested loop join
     if (0 != op.get_equal_join_conditions().count()) {
     } else {
       ObBasicNestedLoopJoinSpec& nlj_spec = static_cast<ObBasicNestedLoopJoinSpec&>(spec);
       nlj_spec.enable_gi_partition_pruning_ = op.is_enable_gi_partition_pruning();
       const ObIArray<std::pair<int64_t, ObRawExpr*>>& nl_params = op.get_nl_params();
       if (nlj_spec.enable_gi_partition_pruning_ &&
           OB_FAIL(do_gi_partition_pruning(op, nlj_spec))) { // 如果可以的话，进行分区裁剪
       } else if (OB_FAIL(nlj_spec.init_param_count(nl_params.count()))) { // 初始化join的参数数量
       } else {
         ObIArray<ObRawExpr*>& exec_param_exprs = op.get_stmt()->get_exec_param_ref_exprs();
         ARRAY_FOREACH(nl_params, i)// 遍历每个参数
         {
             // 根据参数生成物理执行算子，具体内容略
         }
         if (OB_SUCC(ret) && PHY_NESTED_LOOP_JOIN == spec.type_) {
           // 判断能否使用batch nlj，如果可以就更新flag
           bool use_batch_nlj = false;
           ObNestedLoopJoinSpec& nlj = static_cast<ObNestedLoopJoinSpec&>(spec);
           if (OB_FAIL(op.can_use_batch_nlj(use_batch_nlj))) {// 判断能不能用，当join条件有复数字段组成时不使用batch
           } else if (use_batch_nlj) {
             nlj.use_group_ = use_batch_nlj;
             if (OB_ISNULL(nlj.get_right()) || PHY_TABLE_SCAN != nlj.get_right()->type_) { // 只有table scan的时候才会选择batch nlj
             } else {
               const ObTableScanSpec* right_tsc = static_cast<const ObTableScanSpec*>(nlj.get_right());
               const_cast<ObTableScanSpec*>(right_tsc)->batch_scan_flag_ = true;
             }
           }
         }
       }
     }
   } else if (HASH_JOIN == op.get_join_algo()) {
     // 查询计划是hash join时的处理，暂略
   }
   const common::ObIArray<std::pair<int64_t, ObRawExpr*>>& exec_params = op.get_exec_params();
 
   // 2. add other join conditions
   const ObIArray<ObRawExpr*>& other_join_conds = op.get_other_join_conditions();
   // 初始化other condition
   OZ(spec.other_join_conds_.init(other_join_conds.count()));
 
   ARRAY_FOREACH(other_join_conds, i) // 遍历剩下的条件
   {
     // 逐个生成剩下条件的物理算子
   }  // end for
 
   return ret;
 }
```
{:.left}

`generate_join_spec()` 对于NLJ最为特别的处理就是判断能否使用batch NLJ，这也是我们所关注的第一个优化点。通过debug我们知道，由于比赛中的查询语句的join条件含有两个字段，这个函数不会选择使用batch NLJ。因此，我们通过扩展OB对batch NLJ的支持和修改判定条件，使得`generate_join_spec()`能将比赛中的查询转化为batch NLJ的物理执行计划。

## 查询执行：以Index Nested Loop Join为例

当逻辑执行计划里的NLJ经过`generate_join_spec`转换为物理的执行算子之后，OB就会通过火山模型逐层执行物理算子，并一次向上层算子呈递一行数据。对于NLJ而言，这部分功能主要由`ObNestedLoopJoinOp::inner_get_next_row()`实现。这一函数并不需要返回值，是因为它会直接通过修改上下文信息的方式保存一次调用所获取的数据。

作为一个join算子，`ObNestedLoopJoinOp`很自然地含有两个子节点。对于比赛中的查询语句，我们可以很容易知道这两个子节点都是table scan算子。且不论左右节点的区别，每次调用join算子时需要从左右节点分别获取一行数据并连接。但在执行过程中可能出现很多种情况，比如右节点获取的数据与左节点获取的数据不匹配，遍历完右节点都无法与左节点当前的数据匹配等等。因此，为了更好地实现这部分逻辑，OB在函数中实现了一个小型的状态机，根据当前状态选择后续需要执行的函数。示意图如下：

```flow
start=>start: 开始inner_get_next_row
end=>end: 返回结果
left_op=>operation: read_left_operate()
left_going=>operation: read_left_func_going()
left_end=>operation: read_left_func_end()
right_op=>operation: read_right_operate()
right_going=>operation: read_right_func_going()
right_end=>operation: read_right_func_end()
iter_end1=>condition: 左节点存在下一行数据
iter_end2=>condition: 右节点存在下一行数据
output_product=>condition: 连接成功

start->left_op->iter_end1
iter_end1(yes)->left_going->right_op->iter_end2
iter_end1(no)->left_end->end
iter_end2(yes)->right_going->output_product
iter_end2(no)->right_end->output_product
output_product(yes)->end
output_product(no)->left_op
```
{:.left}

其代码抽象如下：

```cpp
int ObNestedLoopJoinOp::inner_get_next_row()
{
  int ret = OB_SUCCESS;
  if (OB_UNLIKELY(LEFT_SEMI_JOIN == MY_SPEC.join_type_ || LEFT_ANTI_JOIN == MY_SPEC.join_type_)) {
   	// 处理半连接，具体内容略
  } else {
    state_operation_func_type state_operation = NULL;
    state_function_func_type state_function = NULL;
    int func = -1;
    output_row_produced_ = false;
    while (OB_SUCC(ret) && !output_row_produced_) {
      state_operation = this->ObNestedLoopJoinOp::state_operation_func_[state_];// state_取值为left right，表示当前执行左节点还是右节点的任务
      if (OB_ITER_END == (ret = (this->*state_operation)())) {
        func = FT_ITER_END;// func的取值为end、going，对应取流程图中end或是going后缀的函数
        ret = OB_SUCCESS;
      } else if (OB_FAIL(ret)) {
      } else {
        func = FT_ITER_GOING;
      }
      if (OB_SUCC(ret)) {
        state_function = this->ObNestedLoopJoinOp::state_function_func_[state_][func];
        if (OB_FAIL((this->*state_function)()) && OB_ITER_END != ret) {
        }
      }
    }  // while end
  }
  return ret;
}
```
{:.left}

其中一共包含6个函数，分别是左右节点的`operate(),func_going(),func_end()`函数。其中，`operate()`函数负责从对应子节点获取一行数据；`func_going()`函数负责判断是否需要切换为另一个节点的函数，并做预处理，如`left_func_going()`会根据左节点获取的数据，准备扫描右节点所需要的参数（值得一提的是，因为实际上这个函数会深入底层更新右节点的迭代器，所以开销是很大的），`right_func_going()`负责判断是否连接成功；`func_end()`判断是否得到了需要的结果，并修改`inner_get_next_row()`的返回值。

在这6个函数中，`func_going()`和`func_end()`的函数逻辑都比较简单，我们不再在这里赘述。以下主要介绍左右节点的`operate()`函数，这也是我们优化batch_nlj所主要关心的函数。

### Join的左子节点实现：batch, or not batch

根据在构建物理执行树时的判断，left_operate()存在两种执行逻辑，分别对应不使用batch NLJ和使用batch NLJ。当不使用batch nlj时，函数直接调用对应算子的next_row()方法。这一方法会不断向下获取一行数据，具体的调用栈如下：

```cpp
 oceanbase::storage::ObmultipleScanMergeImpI::supply_consume()
 oceanbase::storage::ObmultipleScanMergeImpI::inner_get_next_row()
 oceanbase::storage::ObmultipleScanMerge::inner_get_next_row()
 oceanbase::storage::ObmultipleMerge::get_next_row()
 oceanbase::storage::ObTableScanStoreRowIterator::get_next_row()
 oceanbase::storage::ObTableScanRangeArrayRowIterator::get_next_row()
 oceanbase::storage::ObTableScanIterator::get_next_row()
 oceanbase::sql::ObTableScanOp::get_next_row_with_mode()
 oceanbase::sql::ObTableScanOp::inner_get_next_row()
 oceanbase::sql::ObOperator::get_next_row()
 oceanbase::sql::ObJoinOp::get_next_left_row()
 oceanbase::sql::ObBasicNestedLoopJoin::get_next_left_row()
```
{:.left}

通过检查代码，我们发现每层调用的逻辑都非常清晰，主要是调用下层接口以及异常处理，因此不再赘述。我们主要讨论使用batch NLJ时的执行逻辑。

当使用batch NLJ时，join算子会先取出左节点中的一批数据，然后再逐个与右节点进行匹配。这种方式可以更好地利用数据的局部性，提高对磁盘数据的访问效率。为了实现批量获取数据，同时又不改变程序其他部分的逻辑，使用batch NLJ时需要在第一次调用时连续调用多次算子的`next_row()`方法并存储对应的数据，在后续调用时直接从存储的数据中导出对应数据。其代码抽象如下：

```cpp
 int ObNestedLoopJoinOp::group_read_left_operate()
 {
   int ret = OB_SUCCESS;
   ObTableScanOp* right_tsc = reinterpret_cast<ObTableScanOp*>(right_);
   if (left_store_iter_.is_valid() && left_store_iter_.has_next()) {
     // 当当前还有存储数据时，直接获取存储数据，具体内容略
   } else { // 没有存储数据时，批量获取数据
     if (OB_FAIL(right_tsc->group_rescan_init(MY_SPEC.batch_size_))) {
     } else if (is_left_end_) { // 判断左节点是否已经取完
     } else {
       if (OB_ISNULL(mem_context_)) {
           // 初始化存储数据的结构，具体内容略
       }
 
       bool ignore_end = false;
       if (OB_SUCC(ret)) {
           //初始化或重置访问数据和它的迭代器left_store_和left_store_iter_，具体内容略
         }
         save_last_row_ = false;
         while (OB_SUCC(ret) && !is_full()) {
             // 批量获取数据
           clear_evaluated_flag(); // 清理访问参数
           if (OB_FAIL(get_next_left_row())) { // 获取下一行
             if (OB_ITER_END != ret) {
             } else {
               is_left_end_ = true;
             }
           } else if (OB_FAIL(left_store_.add_row(left_->get_spec().output_, &eval_ctx_))) {// 存储到存储到对应的结构left_store_中
           } else if (OB_FAIL(prepare_rescan_params(true /*is_group*/))) {
           } else if (OB_FAIL(deep_copy_dynamic_obj())) {
           } else if (OB_FAIL(right_tsc->group_add_query_range())) { // 存储对应的右节点访问参数
           } else {
             ignore_end = true;
           }
         }
       }
 
       if (OB_SUCC(ret) || (ignore_end && OB_ITER_END == ret)) {
         // 更新迭代器left_store_iter_，并更新右节点的访问参数，具体内容略
       }
     }
   }
 
   if (OB_SUCC(ret)) { // 从存储结构left_store_里拿一行数据，作为本次调用的返回结果
     if (OB_FAIL(left_store_iter_.get_next_row(left_->get_spec().output_, eval_ctx_))) {
     } else {
       left_row_joined_ = false;
     }
   }
   return ret;
 }
```
{:.left}

可以注意到，在执行过程中，`group_read_left_operate()`会存储每一行数据对应的右节点访问参数。更具体来说，是这一行数据对应第一个join条件字段的值。因此，如果存在多于一个join字段，剩余的字段值不会被存储，这导致使用batch NLJ时无法正确根据join条件过滤结果，这也是OB原本只限制在join条件唯一时使用batch NLJ的原因。为了使用batch NLJ，我们对存储结构进行扩展，使它能存储剩余条件字段的值，从而保证对于比赛的查询语句也能有效且正确使用batch NLJ。

### J**oin的右节点实现：index merge**

与左节点稍有不同，右节点并非是一个普通的table scan，而是一个带有index的scan。因此，在这个算子扫描结果的时候，会首先在索引表中进行搜索和定位，然后基于定位的结果直接构造数据表中的迭代器，从而加速数据的获取。这一流程在代码上的体现便是这个算子同时维护了两张表的迭代器，分别是数据表的`main_iter_`和索引表的`index_iter_`。其代码抽象如下：

```cpp
 int ObIndexMerge::get_next_row(ObStoreRow*& row)
 {
   int ret = OB_SUCCESS;
   if (OB_UNLIKELY(NULL == index_iter_) || OB_UNLIKELY(NULL == access_ctx_)) { // 没有初始化
   } else if (access_ctx_->is_end()) { // 已经扫描完了
   } else {
     while (OB_SUCC(ret)) {
       if (NULL != main_iter_ && OB_SUCC(main_iter_->get_next_row(row))) { // 数据表获取到一行数据，直接结束
         break;
       } else {
         if (OB_ITER_END == ret) {
           if (!access_ctx_->is_end()) {
             ret = OB_SUCCESS;
           }
           main_iter_ = NULL;
         }
 
         if (OB_SUCC(ret)) {
           // batch get main table rowkeys from index table
           // 初始化键值参数等结构，具体内容略
           for (int64_t i = 0; OB_SUCC(ret) && i < MAX_NUM_PER_BATCH; ++i) {
             if (OB_FAIL(index_iter_->get_next_row(index_row))) { // 索引表获取数据
               if (OB_ARRAY_BINDING_SWITCH_ITERATOR == ret) {
                 ++index_range_array_cursor_;
                 if (OB_FAIL(index_iter_->switch_iterator(index_range_array_cursor_))) {
                 }
               } else if (OB_ITER_END != ret) {
               }
             } else { // 存储获取的数据
               src_key.assign(index_row->row_val_.cells_, rowkey_cnt_);
               if (OB_FAIL(src_key.deep_copy(dest_key.get_store_rowkey(), rowkey_allocator_))) {
               } else {
                 dest_key.set_range_array_idx(index_row->range_array_idx_);
                 if (OB_FAIL(rowkeys_.push_back(dest_key))) {
                 }
               }
             }
           }
           if (OB_SUCC(ret)) {
             if (OB_FAIL(table_iter_.open(rowkeys_))) { // 根据索引表的数据初始化数据表的迭代器
             } else {
               main_iter_ = &table_iter_;
             }
           }
         }
       }
     }
   }
   return ret;
 }
```
{:.left}

## 总结：如何从代码结构上对OB的源码进行分析？

或许很多人会像我们一样，在一开始看到源码的时候不知所措。毕竟，OB作为一个非常庞大的项目，很难快速找到入手的部分。根据我们的经验，在这种情况下，一般可以先使用perf来快速找到最耗时的执行部分，这部分代码往往与核心逻辑紧密相关，如我们上述展示的部分代码。在此基础上，结合gdb debug，可以获取到执行过程中的主要调用栈。往往我们会发现调用栈很深，但是其中大部分的代码都不会涉及到核心逻辑，不需要逐个深入地研究。因此，再通过OB的代码自注释和基本的数据库知识可以有效地定位到所想要修改的部分。

当定位到要修改的部分之后，如何具体地分析源码的逻辑呢？首先需要熟悉OB的代码风格，能将连续的条件嵌套重新翻译为顺序执行。然后通过代码的自注释去感受实现的功能，由于OB中大部分的类都带有很多层的嵌套，在一开始不断深挖某个细节很容易晕头转向，采用“不求甚解”的态度，先宏观上把握整个执行流程，对于代码的分析会更有利。在了解了整体的流程之后，再结合逐步调试去深入理解其中的执行流程。

希望上述的方法分享，能够帮助大家分析OB代码，为大家在开源社区中的贡献添砖加瓦。