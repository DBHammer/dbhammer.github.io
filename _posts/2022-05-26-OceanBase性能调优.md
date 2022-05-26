---
title: OceanBase性能调优
tags: oceanbase
author: 张惠东
member: 张惠东
---

本文介绍调试OceanBase代码的方法，以及Nested-Loop-Join性能优化的思路

## 编译部署OceanBase

- 从源代码编译OceanBase
    
    想要在OceanBase源代码上进行调试，优化，第一件要做的事就是从源代码编译OceanBase。这里推荐克隆[OceanBase数据库大赛的比赛分支](https://github.com/oceanbase/oceanbase/tree/oceanbase_competition)，克隆完成之后按照[官方教程](https://open.oceanbase.com/docs/community/oceanbase-database/V3.1.0/get-the-oceanbase-database-by-using-source-code)从源码构建OceanBase数据库，其中debug版本可以打断点调试，release版本可以用来测试性能。
    
- 安装Oceanbase部署工具OBD
    
    接下来参照[官方文档](https://open.oceanbase.com/docs/community/oceanbase-database/V3.1.0/use-obd-to-obtain-the-oceanbase-database)安装OceanBase的部署工具OBD，安装完成之后进入OceanBase源码的编译目录（如build_release），在ocenbase-ce v3.1.0的基础上创建tag为obcompetition的OBD镜像。
    
    ```bash
    obd mirror create -n oceanbase-ce -V 3.1.0 -p ./usr/local -t obcompetition
    ```
    

- 部署数据库
    
    创建完镜像之后，可以通过配置文件部署数据库，官方有一些配置文件的[示例](https://github.com/oceanbase/obdeploy/tree/master/example)，本文使用的配置文件ob.yaml如下：
    
    ```bash
    oceanbase-ce:
      # tag设置为刚才创建镜像obcompetition的tag
    	tag: obcompetition
      servers:
      - name: test
        ip: 127.0.0.1
    
      global:
    		# home_path需要修改成自己想要部署的目录
        home_path: *****
        devname: lo
        mysql_port: 2881
        rpc_port: 2882
        zone: zone1
        cluster_id: 1
        datafile_size: 10G
        appname: obcompetition
    
      test:
        syslog_level: INFO
        enable_syslog_recycle: true
        enable_syslog_wf: true
        max_syslog_file_count: 4
        memory_limit: 12G
        system_memory: 6G
        cpu_count: 16
    ```
    
    部署数据库前确定目录home_path为空，之后使用autodeploy自动部署名称为obcompetition的数据库。
    
    ```bash
    obd cluster deploy obcompetition -c ob.yaml
    ```
    
    启动数据库，创建测试用租户test，并且将除sys租户以外的资源全部给test租户。
    
    ```bash
    obd cluster start obcompetition
    obd cluster tenant create obcompetition --tenant-name test
    ```
    
    创建完租户之后就可以通过mysql客户端，连接OceanBase的test租户或者sys租户。
    
    ```bash
    mysql --host 127.0.0.1 --port 2881 -uroot@test
    mysql --host 127.0.0.1 --port 2881 -uroot@sys
    ```
    

- 修改代码后重新部署数据库
    
    在源代码上进行修改之后，首先需要重新编译代码，然后用编译完的内容替换正在运行的observer。首先查看正在运行的observer所在位置，即bin/observer所在的位置，然后ls -l看出这个observer是一个软连接，想要替换它只需要将软连接连接到刚编译出来的observer二进制文件。
    
    ```bash
    ps -ef | grep observer
    ls -l ***/bin/observer
    ```
    
    最后重新启动obcompetition
    
    ```bash
    obd cluster restart obcompetition
    ```
    

## 代码调试工具

---

- vscode远程调试
    
    在阅读，修改OceanBase源码的时候，需要调试代码，不过OceanBase需要的配置比较高，一般部署在服务器上，这时候使用vscode进行远程调试就比较优雅。
    
    首先在vscode装一下Remote - SSH插件，打开服务器上的OceanBase源代码目录，然后再Debug界面创建一个新的launch.json文件。
    
    ![创建新的launch.json](/auto-image/picrepo/4d564b4d-4dfe-44bf-869b-9b0c6dddf45a.png)    
    
    创建新的launch.json
    
    将launch.json替换为下面的配置，”configurations”→”program”需要替换为OceanBase配置文件里对应内容。
    
    ```json
    {
        "configurations": [
            {
                "name": "(gdb) Attach",
                "type": "cppdbg",
                "request": "attach",
    						// program需要替换为/home_path/bin/observer
    						// 其中home_path是OceanBase配置文件里的对应内容
                "program": "****",
                "processId": "${input:FindPID}",
                "MIMode": "gdb",
                "sudo": true,
                "miDebuggerPath": "gdb",
                "setupCommands": [
                    {
                        "description": "Enable pretty-printing for gdb",
                        "text": "-enable-pretty-printing",
                        "ignoreFailures": true
                    }
                ],
    						// 这里建立了一些目录映射
    						// 如果调试的时候提示找不到source，还需要自己加上对应的目录映射
                "sourceFileMap": {
                    "./build_debug/src/observer/./src/observer/omt": {
                        "editorPath": "${workspaceFolder}/src/observer/omt"
                    },
                    "./build_debug/src/sql/parser/./src/sql/parser": {
                        "editorPath": "${workspaceFolder}/src/sql/parser",
                        "useForBreakpoints": true
                    },
                    "./build_debug/src/sql/./src/sql": {
                        "editorPath": "${workspaceFolder}/src/sql",
                        "useForBreakpoints": true
                    },
                    "./build_debug/src/sql/engine/join/./src/sql/engine/join": {
                        "editorPath": "${workspaceFolder}/src/sql/engine/join",
                        "useForBreakpoints": true
                    },
                    "./build_debug/src/storage/./src/storage": {
                        "editorPath": "${workspaceFolder}/src/storage",
                        "useForBreakpoints": true
                    },
                    "./build_debug/src/rootserver/./src/rootserver": {
                        "editorPath": "${workspaceFolder}/src/rootserver",
                        "useForBreakpoints": true
                    },
                    "./build_debug/src/share/./src/share": {
                        "editorPath": "${workspaceFolder}/src/share",
                        "useForBreakpoints": true
                    }
                }
            }
        ],
        "inputs": [
            {
                "id": "FindPID",
                "type": "command",
                "command": "shellCommand.execute",
                "args": {
                    "command": "ps -aux | grep /bin/observer | awk '{print $2}' | head -1",
                    "description": "Select your observer PID",
                    "useFirstResult": true,
                }
            }
        ]
    }
    ```
    
    然后在服务器上装一个Tasks Shell Input插件，来通过脚本动态获取observer的进程id。
    
    ![安装Tasks Shell Input插件](/auto-image/picrepo/7452acdd-b1e5-46da-b020-6c23b1ac1f16.png)    

    安装Tasks Shell Input插件
    
    这样子在启动observer以后就能成功gdb attach了。
    
    ![成功gdb attach](/auto-image/picrepo/95f5bac3-abc6-4c7c-8340-b5a866b80b2b.png)    

    成功gdb attach
    

- 打日志调试
    
    vscode调试还是存在一些问题的，比如打断点的位置可能有很多系统进程都会访问（尤其是存储层的代码），mysql客户端输入sql以后，catch住的进程不一定是执行sql的工作线程，函数的调用栈可能不是你想要的，这时候可以通过打日志的方式进行调试。
    
    OceanBase的日志类型定义在deps/oblib/src/lib/oblog/ob_log_module.h里面，日志目录在/home_path/log，日志内容的格式：
    
    ```bash
    [time]log_level[module_name]function_name(filename:file_no)[thread_id]
    [Ytrace_id0_trace_id1][log=last_log_print_time]log_data
    
    #time 日志记录时间
    #log_level 日志级别
    #module_name 模块名
    #filename:file_no 文件名:行号
    #thread_id 线程id
    ```
    

此外，官方也有讲[一些调试手段](https://github.com/oceanbase/oceanbase/wiki/how_to_debug)。

## 性能测试工具SysBench

---

OceanBase数据库大赛使用SysBench进行性能测试，首先在测试机（客户端）上[安装sysbench](https://github.com/akopytov/sysbench)。

- subplan.lua
    
    性能测试使用的是sysbench的subplan.lua脚本，该脚本在sysbench安装目录内，脚本里的schema为两张表t1和t2。
    
    ```sql
    CREATE TABLE t1(
    	c1 int primary key, 
    	c2 int, 
    	c3 int, 
    	v1 CHAR(60), 
    	v2 CHAR(60), 
    	v3 CHAR(60), 
    	v4 CHAR(60), 
    	v5 CHAR(60), 
    	v6 CHAR(60), 
    	v7 CHAR(60), 
    	v8 CHAR(60), 
    	v9 CHAR(60)
    );
    
    CREATE TABLE t2(
    	c1 int primary key, 
    	c2 int, 
    	c3 int, 
    	v1 CHAR(60), 
    	v2 CHAR(60), 
    	v3 CHAR(60), 
    	v4 CHAR(60), 
    	v5 CHAR(60), 
    	v6 CHAR(60), 
    	v7 CHAR(60), 
    	v8 CHAR(60), 
    	v9 CHAR(60)
    )
    ```
    
    t1，t2表建完后插入数据。
    
    ```sql
    INSERT INTO t1 (c1, c2, c3, v1, v2, v3, v4, v5, v6, v7, v8, v9) VALUES(...);
    INSERT INTO t2 (c1, c2, c3, v1, v2, v3, v4, v5, v6, v7, v8, v9) VALUES(...);
    ```
    
    插入数据后在t2表建索引，由于两个索引键都非主键，这两个索引都是二级索引，在查内表时会有一个回表操作，也就是根据索引键查询主键对应的行数据。
    
    ```sql
    create index t2_i1 on t2(c2) local;
    create index t2_i2 on t2(c3) local;
    ```
    
    Select操作限定外表为200个元素的范围查询，通过Hint强制使用Nested-Loop-Join（Index Nested-Loop-Join），并且在c2，c3列进行等值连接。
    
    ```sql
    select /*+ordered use_nl(A,B)*/ * 
    from t1 A, t2 B 
    where A.c1 >= ? and A.c1 < ? and A.c2 = B.c2 and A.c3 = B.c3
    ```
    
    explain看一下OceanBase的查询执行计划，A表是一个全表的scan，查出200行数据作为内表，在一次查询内，对于内表的每一行数据，B表作为外表可以通过t2_i2索引快速定位到相对应的匹配的数据。
    
    ```bash
    ===============================================
    |ID|OPERATOR        |NAME    |EST. ROWS|COST  |
    -----------------------------------------------
    |0 |NESTED-LOOP JOIN|        |193      |138185|
    |1 | TABLE SCAN     |A       |200      |188   |
    |2 | TABLE SCAN     |B(t2_i2)|1        |690   |
    ===============================================
    
    Outputs & filters: 
    -------------------------------------
    0 - output([A.c1], [A.c2], [A.c3], [A.v1], [A.v2], [A.v3], [A.v4], [A.v5], [A.v6], [A.v7], [A.v8], [A.v9], [B.c1], [B.c2], [B.c3], [B.v1], [B.v2], 
    		[B.v3], [B.v4], [B.v5], [B.v6], [B.v7], [B.v8], [B.v9]), filter(nil),
        conds(nil), nl_params_([A.c2], [A.c3]), batch_join=false
    
    1 - output([A.c1], [A.c2], [A.c3], [A.v1], [A.v2], [A.v3], [A.v4], [A.v5], [A.v6], [A.v7], [A.v8], [A.v9]), filter(nil),
    	  access([A.c1], [A.c2], [A.c3], [A.v1], [A.v2], [A.v3], [A.v4], [A.v5], [A.v6], [A.v7], [A.v8], [A.v9]), partitions(p0),
    	  is_index_back=false,
    	  range_key([A.c1]), range[200 ; 400),
    	  range_cond([A.c1 >= 200], [A.c1 < 400])
    
    2 - output([B.c2], [B.c3], [B.c1], [B.v1], [B.v2], [B.v3], [B.v4], [B.v5], [B.v6], [B.v7], [B.v8], [B.v9]), filter([? = B.c2]),
    		access([B.c2], [B.c3], [B.c1], [B.v1], [B.v2], [B.v3], [B.v4], [B.v5], [B.v6], [B.v7], [B.v8], [B.v9]), partitions(p0),
    		is_index_back=true, filter_before_indexback[false],
    		range_key([B.c3], [B.c1]), range(MIN ; MAX),
    		range_cond([? = B.c3])
    ```
    
- 测试脚本
    
    ```bash
    USER=root@test
    DB=test
    HOST=127.0.0.1
    PORT=2881
    THREADS=128
    TABLE_SIZE=100000
    TABLES=3
    TIME=300
    REPORT_INTERVAL=10
    
    sysbench --db-ps-mode=disable --mysql-host=$HOST --mysql-port=$PORT \
             --rand-type=uniform --rand-seed=26765 \
             --mysql-user=$USER --mysql-db=$DB \
             --threads=$THREADS \
             --tables=$TABLES --table_size=$TABLE_SIZE \
             --time=$TIME --report-interval=$REPORT_INTERVAL \
             subplan cleanup
    
    sysbench --db-ps-mode=disable --mysql-host=$HOST --mysql-port=$PORT \
             --rand-type=uniform --rand-seed=26765 \
             --mysql-user=$USER --mysql-db=$DB \
             --threads=$THREADS \
             --tables=$TABLES --table_size=$TABLE_SIZE \
             --time=$TIME --report-interval=$REPORT_INTERVAL \
             subplan prepare
    
    sysbench --db-ps-mode=disable --mysql-host=$HOST --mysql-port=$PORT \
             --rand-type=uniform --rand-seed=26765 \
             --mysql-user=$USER --mysql-db=$DB \
             --threads=$THREADS \
             --tables=$TABLES --table_size=$TABLE_SIZE \
             --time=$TIME --report-interval=$REPORT_INTERVAL \
             subplan run
    ```
    

## 性能调优

---

- iotop
    
    首先看一下sysbench测试过程中，observer的磁盘IO情况，这里选用iotop来从系统/proc目录下读取进程的IO信息进行汇总。
    
    ```bash
    sudo iotop -o
    ```
    
    ![Untitled](/auto-image/picrepo/2a9eed10-7bec-4c0f-b727-ee6629a1e4ab.png)    

    ![Untitled](/auto-image/picrepo/0d7ad7c8-d6b3-4dc4-8316-abe9c4e94818.png)    

    ![sysbench过程中observer的磁盘IO情况](/auto-image/picrepo/5d02b676-e41f-4629-99cc-820acdd1fd6b.png)    

    sysbench过程中observer的磁盘IO情况
    
    可以看出在sysbench测试一段时间后，只有一些异步日志落盘和事务redo日志会产生写IO，读请求的内容不多，应该被cache在内存里了。再加上官方给的优化建议也是从内存优化入手，我们可以把重心放在内存优化上。
    
- perf
    
    perf是一个轻量级的profiling工具。perf top可以实时打印采样函数，显示出花费大部分CPU时间的函数。
    
    ```bash
    sudo perf top -p observer_pid
    ```
    
    ![perf top查看热点函数](/auto-image/picrepo/1bd53e75-5d13-4fb0-918e-87d1772927fd.png)    

    perf top查看热点函数
    
    perf top返回的界面还可以交互，通过annotate跳进函数，还可以看到每个指令的耗时占比。不过返回的都是反汇编的结果，难以将其与源代码联系起来。
    
    ![annotate查看函数每条指令的执行时间占比](/auto-image/picrepo/6f23f286-d8cf-400a-974e-34c32623c488.png)    

    annotate查看函数每条指令的执行时间占比
    
    perf stat还能看程序的branch-misses情况。
    
    ```diff
    sudo perf stat -p observer_pid
    ```
    
    ![Untitled](/auto-image/picrepo/f3bd086f-7b88-425a-814b-871ae1a1a027.png)    

- FlameGraph
    
    perf工具的采样结果需要在终端一个个点开函数才能看到调用栈的信息，比较难以对代码的执行流程有一个宏观上的认识，[FlameGraph](https://github.com/brendangregg/FlameGraph)能够帮助我们可视化perf采样的结果。
    
    ![NestedLoopJoin算子的三个主要部分](/auto-image/picrepo/eac60029-cc3f-4a36-a32d-0a9b661fbe3c.png)    

    NestedLoopJoin算子的三个主要部分
    
    跑sysbench的同时跑一下火焰图，可以看到在NLJ的负载模式下，OceanBase的NestedLoopJoin物理算子执行流程主要包含三个部分（三个蓝色箭头指示），中间部分是对左表的扫描，右边部分是根据左表的每一行，先通过B.c3列（其实就是A.c3列的值）查询索引t2_i2，获取到rowkey后再查询t2，左边部分是左表每一行匹配完，与右表完成Join之后，会重置右表的扫描状态。
    

## 一些优化点

- 优化右表回表逻辑
    
    右表会从索引表一次拿batch rowkeys，然后根据rowkeys数组通过ObMultipleGetMerge查询主表，从火焰图可以看出，这一块占了很大的比重。事实上，如果从索引表只拿到一个rowkey，可以使用ObSingleMerge查询主表，效率更高。
    
    ![原始代码的右表查索引表和回表过程](/auto-image/picrepo/446dc749-0f4b-43b2-8289-ed1f10740d2f.png)    

    原始代码的右表查索引表和回表过程
    
    ```diff
    diff --git a/src/storage/ob_index_merge.cpp b/src/storage/ob_index_merge.cpp
    index e6386773..82c59ba4 100644
    --- a/src/storage/ob_index_merge.cpp
    +++ b/src/storage/ob_index_merge.cpp
    @@ -30,7 +30,9 @@ ObIndexMerge::ObIndexMerge()
           rowkeys_(),
           rowkey_allocator_(ObModIds::OB_SSTABLE_GET_SCAN),
           rowkey_range_idx_(),
    -      index_range_array_cursor_(0)
    +      index_range_array_cursor_(0),
    +      table_iter_single_(),
    +      is_single_(0)
     {}
     
     ObIndexMerge::~ObIndexMerge()
    @@ -49,12 +51,20 @@ void ObIndexMerge::reset()
       rowkey_allocator_.reset();
       rowkey_range_idx_.reset();
       index_range_array_cursor_ = 0;
    +  if (is_single_) {
    +    table_iter_single_.reset();
    +    is_single_ = 0;
    +  }
     }
     
     void ObIndexMerge::reuse()
     {
       table_iter_.reuse();
       index_range_array_cursor_ = 0;
    +  // if (is_single_) {
    +  //   table_iter_single_.reuse();
    +  //   is_single_ = 0;
    +  // }
     }
     
     int ObIndexMerge::open(ObQueryRowIterator& index_iter)
    @@ -71,11 +81,14 @@ int ObIndexMerge::init(const ObTableAccessParam& param, const ObTableAccessParam
       int ret = OB_SUCCESS;
       if (OB_FAIL(table_iter_.init(param, context, get_table_param))) {
         STORAGE_LOG(WARN, "Fail to init table iter, ", K(ret));
    +  } else if (OB_FAIL(table_iter_single_.init(param, context, get_table_param))) {
    +    STORAGE_LOG(WARN, "Fail to init table single iter, ", K(ret));
       } else {
         index_param_ = &index_param;
         access_ctx_ = &context;
         rowkey_cnt_ = param.iter_param_.rowkey_cnt_;
       }
    +  is_single_ = 0;
       return ret;
     }
     
    @@ -107,7 +120,6 @@ int ObIndexMerge::get_next_row(ObStoreRow*& row)
               ObExtStoreRowkey dest_key;
               rowkeys_.reuse();
               rowkey_allocator_.reuse();
    -          table_iter_.reuse();
               access_ctx_->allocator_->reuse();
               for (int64_t i = 0; OB_SUCC(ret) && i < MAX_NUM_PER_BATCH; ++i) {
                 if (OB_FAIL(index_iter_->get_next_row(index_row))) {
    @@ -139,10 +151,21 @@ int ObIndexMerge::get_next_row(ObStoreRow*& row)
               }
     
               if (OB_SUCC(ret)) {
    -            if (OB_FAIL(table_iter_.open(rowkeys_))) {
    -              STORAGE_LOG(WARN, "fail to open iterator", K(ret));
    +            if (1 == rowkeys_.count()) {
    +              table_iter_single_.reuse();
    +              is_single_ = 1;
    +              if (OB_FAIL(table_iter_single_.open(rowkeys_[0]))) {
    +                STORAGE_LOG(WARN, "fail to open iterator", K(ret));
    +              } else {
    +                main_iter_ = &table_iter_single_;
    +              }
                 } else {
    -              main_iter_ = &table_iter_;
    +              table_iter_.reuse();
    +              if (OB_FAIL(table_iter_.open(rowkeys_))) {
    +                STORAGE_LOG(WARN, "fail to open iterator", K(ret));
    +              } else {
    +                main_iter_ = &table_iter_;
    +              }
                 }
               }
             }
    diff --git a/src/storage/ob_index_merge.h b/src/storage/ob_index_merge.h
    index e7a6cde5..cdeb0da1 100644
    --- a/src/storage/ob_index_merge.h
    +++ b/src/storage/ob_index_merge.h
    @@ -19,6 +19,7 @@
     #include "storage/ob_multiple_get_merge.h"
     #include "storage/ob_query_iterator_util.h"
     #include "storage/blocksstable/ob_block_sstable_struct.h"
    +#include "storage/ob_single_merge.h"
     
     namespace oceanbase {
     namespace storage {
    @@ -50,6 +51,8 @@ class ObIndexMerge : public ObQueryRowIterator {
       common::ObArenaAllocator rowkey_allocator_;
       ObArray<int64_t> rowkey_range_idx_;
       int64_t index_range_array_cursor_;
    +  ObSingleMerge table_iter_single_;
    +  int is_single_;
     
     private:
       DISALLOW_COPY_AND_ASSIGN(ObIndexMerge);
    diff --git a/src/storage/ob_single_merge.cpp b/src/storage/ob_single_merge.cpp
    index 42a34425..3c76aa0f 100644
    --- a/src/storage/ob_single_merge.cpp
    +++ b/src/storage/ob_single_merge.cpp
    @@ -141,9 +141,10 @@ int ObSingleMerge::inner_get_next_row(ObStoreRow& row)
         int64_t end_table_idx = 0;
         int64_t row_cache_snapshot_version = 0;
         const ObIArray<ObITable*>& tables = tables_handle_.get_tables();
    -    const bool enable_fuse_row_cache = is_x86() && access_ctx_->use_fuse_row_cache_ &&
    -                                       access_param_->iter_param_.enable_fuse_row_cache() &&
    -                                       access_ctx_->fuse_row_cache_hit_rate_ > 6;
    +    // const bool enable_fuse_row_cache = is_x86() && access_ctx_->use_fuse_row_cache_ &&
    +    //                                    access_param_->iter_param_.enable_fuse_row_cache() &&
    +    //                                    access_ctx_->fuse_row_cache_hit_rate_ > 6;
    +    const bool enable_fuse_row_cache = false;
         access_ctx_->query_flag_.set_not_use_row_cache();
         const int64_t table_cnt = tables.count();
         ObITable* table = NULL;
    ```
    
    ![rowkey为1时使用SingleMerge回表](/auto-image/picrepo/353362bb-1b37-411c-8fcf-b510231d8427.png)    

    rowkey为1时使用SingleMerge回表
    
- rescan过程中尽量少进行对象析构
    
    从火焰图中可以看出，reuse_row_iters会析构掉很多对象，优化思路是保证这些被析构的对象在整个查询过程中始终内存有效，并且每次rescan时重置一些状态。
    
    ![reuse row iters的内容](/auto-image/picrepo/b5f00979-65b3-4d3b-b771-067faf285e27.png)    

    reuse row iters的内容
    
    ```diff
    diff --git a/src/storage/memtable/ob_memtable.cpp b/src/storage/memtable/ob_memtable.cpp
    index 3a4d28f7..ba7d295d 100644
    --- a/src/storage/memtable/ob_memtable.cpp
    +++ b/src/storage/memtable/ob_memtable.cpp
    @@ -1033,7 +1033,7 @@ int ObMemtable::get(const storage::ObTableIterParam& param, storage::ObTableAcce
         TRANS_LOG(WARN, "invalid argument, ", K(ret), K(param), K(context));
       } else if (OB_FAIL(context.store_ctx_->mem_ctx_->get_trans_status())) {
         TRANS_LOG(WARN, "trans already end", K(ret));
    -  } else if (NULL == (get_iter_buffer = context.allocator_->alloc(sizeof(ObMemtableGetIterator))) ||
    +  } else if (NULL == (get_iter_buffer = context.stmt_allocator_->alloc(sizeof(ObMemtableGetIterator))) ||
                  NULL == (get_iter_ptr = new (get_iter_buffer) ObMemtableGetIterator())) {
         TRANS_LOG(WARN, "construct ObMemtableGetIterator fail");
         ret = OB_ALLOCATE_MEMORY_FAILED;
    @@ -1082,7 +1082,7 @@ int ObMemtable::scan(const storage::ObTableIterParam& param, storage::ObTableAcc
       } else {
         if (param.is_multi_version_minor_merge_) {
           if (GCONF._enable_sparse_row) {
    -        if (NULL == (scan_iter_buffer = context.allocator_->alloc(sizeof(ObMemtableMultiVersionScanSparseIterator))) ||
    +        if (NULL == (scan_iter_buffer = context.stmt_allocator_->alloc(sizeof(ObMemtableMultiVersionScanSparseIterator))) ||
                 NULL == (scan_iter_ptr = new (scan_iter_buffer) ObMemtableMultiVersionScanSparseIterator())) {
               TRANS_LOG(WARN,
                   "construct ObMemtableMultiVersionScanSparseIterator fail",
    @@ -1099,7 +1099,7 @@ int ObMemtable::scan(const storage::ObTableIterParam& param, storage::ObTableAcc
               TRANS_LOG(WARN, "scan iter init fail", "ret", ret, K(real_range), K(param), K(context));
             }
           } else {
    -        if (NULL == (scan_iter_buffer = context.allocator_->alloc(sizeof(ObMemtableMultiVersionScanIterator))) ||
    +        if (NULL == (scan_iter_buffer = context.stmt_allocator_->alloc(sizeof(ObMemtableMultiVersionScanIterator))) ||
                 NULL == (scan_iter_ptr = new (scan_iter_buffer) ObMemtableMultiVersionScanIterator())) {
               TRANS_LOG(WARN,
                   "construct ObMemtableScanIterator fail",
    @@ -1117,7 +1117,7 @@ int ObMemtable::scan(const storage::ObTableIterParam& param, storage::ObTableAcc
             }
           }
         } else {
    -      if (NULL == (scan_iter_buffer = context.allocator_->alloc(sizeof(ObMemtableScanIterator))) ||
    +      if (NULL == (scan_iter_buffer = context.stmt_allocator_->alloc(sizeof(ObMemtableScanIterator))) ||
               NULL == (scan_iter_ptr = new (scan_iter_buffer) ObMemtableScanIterator())) {
             TRANS_LOG(WARN,
                 "construct ObMemtableScanIterator fail",
    @@ -1162,7 +1162,7 @@ int ObMemtable::multi_get(const storage::ObTableIterParam& param, storage::ObTab
         TRANS_LOG(WARN, "invalid argument, ", K(ret), K(param), K(context), K(rowkeys));
       } else if (OB_FAIL(context.store_ctx_->mem_ctx_->get_trans_status())) {
         TRANS_LOG(WARN, "trans already end", K(ret));
    -  } else if (NULL == (mget_iter_buffer = context.allocator_->alloc(sizeof(ObMemtableMGetIterator))) ||
    +  } else if (NULL == (mget_iter_buffer = context.stmt_allocator_->alloc(sizeof(ObMemtableMGetIterator))) ||
                  NULL == (mget_iter_ptr = new (mget_iter_buffer) ObMemtableMGetIterator())) {
         TRANS_LOG(WARN,
             "construct ObMemtableMGetIterator fail",
    @@ -1212,7 +1212,7 @@ int ObMemtable::multi_scan(const storage::ObTableIterParam& param, storage::ObTa
         TRANS_LOG(WARN, "invalid argument, ", K(ret), K(param), K(context), K(ranges));
       } else if (OB_FAIL(context.store_ctx_->mem_ctx_->get_trans_status())) {
         TRANS_LOG(WARN, "trans already end", K(ret));
    -  } else if (NULL == (mscan_iter_buffer = context.allocator_->alloc(sizeof(ObMemtableMScanIterator))) ||
    +  } else if (NULL == (mscan_iter_buffer = context.stmt_allocator_->alloc(sizeof(ObMemtableMScanIterator))) ||
                  NULL == (mscan_iter_ptr = new (mscan_iter_buffer) ObMemtableMScanIterator())) {
         TRANS_LOG(WARN,
             "construct ObMemtableMScanIterator fail",
    diff --git a/src/storage/ob_i_store.h b/src/storage/ob_i_store.h
    index e13283f7..69971590 100644
    --- a/src/storage/ob_i_store.h
    +++ b/src/storage/ob_i_store.h
    @@ -833,6 +833,8 @@ public:
       }
       virtual void reuse()
       {}
    +  virtual void reset()
    +  {}
       virtual bool is_base_sstable_iter() const
       {
         return false;
    diff --git a/src/storage/ob_multiple_get_merge.cpp b/src/storage/ob_multiple_get_merge.cpp
    index ebfd26a7..c5686543 100644
    --- a/src/storage/ob_multiple_get_merge.cpp
    +++ b/src/storage/ob_multiple_get_merge.cpp
    @@ -82,7 +82,7 @@ void ObMultipleGetMerge::reset_with_fuse_row_cache()
         handles_ = nullptr;
       }
       prefetch_cnt_ = 0;
    -  reuse_iter_array();
    +  reset_iter_array();
     }
     
     void ObMultipleGetMerge::reset()
    diff --git a/src/storage/ob_multiple_merge.cpp b/src/storage/ob_multiple_merge.cpp
    index be8de75f..f5c92405 100644
    --- a/src/storage/ob_multiple_merge.cpp
    +++ b/src/storage/ob_multiple_merge.cpp
    @@ -505,6 +505,10 @@ void ObMultipleMerge::reset()
         if (NULL != (iter = iters_.at(i))) {
           iter->~ObStoreRowIterator();
         }
    +    if (OB_NOT_NULL(access_ctx_->stmt_allocator_)) {
    +      access_ctx_->stmt_allocator_->free(iter);
    +    }
    +    iter = NULL;
       }
       padding_allocator_.reset();
       iters_.reset();
    @@ -541,17 +545,31 @@ void ObMultipleMerge::reuse()
       read_memtable_only_ = false;
     }
     
    -void ObMultipleMerge::reuse_iter_array()
    +void ObMultipleMerge::reset_iter_array()
     {
       ObStoreRowIterator* iter = NULL;
       for (int64_t i = 0; i < iters_.count(); ++i) {
         if (NULL != (iter = iters_.at(i))) {
           iter->~ObStoreRowIterator();
         }
    +    if (OB_NOT_NULL(access_ctx_->stmt_allocator_)) {
    +      access_ctx_->stmt_allocator_->free(iter);
    +    }
    +    iter = NULL;
       }
       iters_.reuse();
     }
     
    +void ObMultipleMerge::reuse_iter_array()
    +{
    +  ObStoreRowIterator* iter = NULL;
    +  for (int64_t i = 0; i < iters_.count(); ++i) {
    +    if (NULL != (iter = iters_.at(i))) {
    +      iter->reuse();
    +    }
    +  }
    +}
    +
     int ObMultipleMerge::open()
     {
       int ret = OB_SUCCESS;
    @@ -946,7 +964,7 @@ int ObMultipleMerge::refresh_table_on_demand()
       } else if (need_refresh) {
         if (OB_FAIL(save_curr_rowkey())) {
           STORAGE_LOG(WARN, "fail to save current rowkey", K(ret));
    -    } else if (FALSE_IT(reuse_iter_array())) {
    +    } else if (FALSE_IT(reset_iter_array())) {
         } else if (OB_FAIL(prepare_read_tables())) {
           STORAGE_LOG(WARN, "fail to prepare read tables", K(ret));
         } else if (OB_FAIL(reset_tables())) {
    diff --git a/src/storage/ob_multiple_merge.h b/src/storage/ob_multiple_merge.h
    index ed227202..a560172d 100644
    --- a/src/storage/ob_multiple_merge.h
    +++ b/src/storage/ob_multiple_merge.h
    @@ -80,6 +80,7 @@ protected:
       const ObTableIterParam* get_actual_iter_param(const ObITable* table) const;
       int project_row(const ObStoreRow& unprojected_row, const common::ObIArray<int32_t>* projector,
           const int64_t range_idx_delta, ObStoreRow& projected_row);
    +  void reset_iter_array();
       void reuse_iter_array();
       virtual int skip_to_range(const int64_t range_idx);
     
    diff --git a/src/storage/ob_sstable.cpp b/src/storage/ob_sstable.cpp
    index 13a3f0fa..c0713bbc 100644
    --- a/src/storage/ob_sstable.cpp
    +++ b/src/storage/ob_sstable.cpp
    @@ -1105,14 +1105,14 @@ int ObSSTable::get(const storage::ObTableIterParam& param, storage::ObTableAcces
         ObISSTableRowIterator* row_getter = NULL;
         if (is_multi_version_minor_sstable() && (context.is_multi_version_read(get_upper_trans_version()) ||
                                                     contain_uncommitted_row() || !meta_.has_compact_row_)) {
    -      if (NULL == (buf = context.allocator_->alloc(sizeof(ObSSTableMultiVersionRowGetter)))) {
    +      if (NULL == (buf = context.stmt_allocator_->alloc(sizeof(ObSSTableMultiVersionRowGetter)))) {
             ret = OB_ALLOCATE_MEMORY_FAILED;
             STORAGE_LOG(WARN, "Fail to allocate memory, ", K(ret));
           } else {
             row_getter = new (buf) ObSSTableMultiVersionRowGetter();
           }
         } else {
    -      if (NULL == (buf = context.allocator_->alloc(sizeof(ObSSTableRowGetter)))) {
    +      if (NULL == (buf = context.stmt_allocator_->alloc(sizeof(ObSSTableRowGetter)))) {
             ret = OB_ALLOCATE_MEMORY_FAILED;
             STORAGE_LOG(WARN, "Fail to allocate memory, ", K(ret));
           } else {
    @@ -1163,14 +1163,14 @@ int ObSSTable::multi_get(const ObTableIterParam& param, ObTableAccessContext& co
           ObISSTableRowIterator* row_getter = NULL;
           if (is_multi_version_minor_sstable() && (context.is_multi_version_read(get_upper_trans_version()) ||
                                                       contain_uncommitted_row() || !meta_.has_compact_row_)) {
    -        if (NULL == (buf = context.allocator_->alloc(sizeof(ObSSTableMultiVersionRowMultiGetter)))) {
    +        if (NULL == (buf = context.stmt_allocator_->alloc(sizeof(ObSSTableMultiVersionRowMultiGetter)))) {
               ret = OB_ALLOCATE_MEMORY_FAILED;
               STORAGE_LOG(WARN, "Fail to allocate memory, ", K(ret));
             } else {
               row_getter = new (buf) ObSSTableMultiVersionRowMultiGetter();
             }
           } else {
    -        if (NULL == (buf = context.allocator_->alloc(sizeof(ObSSTableRowMultiGetter)))) {
    +        if (NULL == (buf = context.stmt_allocator_->alloc(sizeof(ObSSTableRowMultiGetter)))) {
               ret = OB_ALLOCATE_MEMORY_FAILED;
               STORAGE_LOG(WARN, "Fail to allocate memory, ", K(ret));
             } else {
    @@ -1269,21 +1269,21 @@ int ObSSTable::scan(const ObTableIterParam& param, ObTableAccessContext& context
         void* buf = NULL;
         ObISSTableRowIterator* row_scanner = NULL;
         if (context.query_flag_.is_whole_macro_scan()) {
    -      if (NULL == (buf = context.allocator_->alloc(sizeof(ObSSTableRowWholeScanner)))) {
    +      if (NULL == (buf = context.stmt_allocator_->alloc(sizeof(ObSSTableRowWholeScanner)))) {
             ret = OB_ALLOCATE_MEMORY_FAILED;
             STORAGE_LOG(WARN, "Fail to allocate memory, ", K(ret));
           } else {
             row_scanner = new (buf) ObSSTableRowWholeScanner();
           }
         } else if (is_multi_version_minor_sstable()) {
    -      if (NULL == (buf = context.allocator_->alloc(sizeof(ObSSTableMultiVersionRowScanner)))) {
    +      if (NULL == (buf = context.stmt_allocator_->alloc(sizeof(ObSSTableMultiVersionRowScanner)))) {
             ret = OB_ALLOCATE_MEMORY_FAILED;
             STORAGE_LOG(WARN, "Fail to allocate memory, ", K(ret));
           } else {
             row_scanner = new (buf) ObSSTableMultiVersionRowScanner();
           }
         } else {
    -      if (NULL == (buf = context.allocator_->alloc(sizeof(ObSSTableRowScanner)))) {
    +      if (NULL == (buf = context.stmt_allocator_->alloc(sizeof(ObSSTableRowScanner)))) {
             ret = OB_ALLOCATE_MEMORY_FAILED;
             STORAGE_LOG(WARN, "Fail to allocate memory, ", K(ret));
           } else {
    @@ -1435,14 +1435,14 @@ int ObSSTable::multi_scan(const ObTableIterParam& param, ObTableAccessContext& c
         void* buf = NULL;
         ObISSTableRowIterator* row_scanner = NULL;
         if (is_multi_version_minor_sstable()) {
    -      if (NULL == (buf = context.allocator_->alloc(sizeof(ObSSTableMultiVersionRowMultiScanner)))) {
    +      if (NULL == (buf = context.stmt_allocator_->alloc(sizeof(ObSSTableMultiVersionRowMultiScanner)))) {
             ret = OB_ALLOCATE_MEMORY_FAILED;
             STORAGE_LOG(WARN, "Fail to allocate memory, ", K(ret));
           } else {
             row_scanner = new (buf) ObSSTableMultiVersionRowMultiScanner();
           }
         } else {
    -      if (NULL == (buf = context.allocator_->alloc(sizeof(ObSSTableRowMultiScanner)))) {
    +      if (NULL == (buf = context.stmt_allocator_->alloc(sizeof(ObSSTableRowMultiScanner)))) {
             ret = OB_ALLOCATE_MEMORY_FAILED;
             STORAGE_LOG(WARN, "Fail to allocate memory, ", K(ret));
           } else {
    diff --git a/src/storage/ob_sstable_row_iterator.cpp b/src/storage/ob_sstable_row_iterator.cpp
    index 27c89147..cc0d2dd5 100644
    --- a/src/storage/ob_sstable_row_iterator.cpp
    +++ b/src/storage/ob_sstable_row_iterator.cpp
    @@ -1539,7 +1539,7 @@ int ObSSTableRowIterator::alloc_micro_getter()
       int ret = OB_SUCCESS;
       void* buf = NULL;
       if (NULL == micro_getter_) {
    -    if (NULL == (buf = access_ctx_->allocator_->alloc(sizeof(ObMicroBlockRowGetter)))) {
    +    if (NULL == (buf = access_ctx_->stmt_allocator_->alloc(sizeof(ObMicroBlockRowGetter)))) {
           ret = OB_ALLOCATE_MEMORY_FAILED;
           STORAGE_LOG(WARN, "Fail to allocate memory, ", K(ret));
         } else {
    @@ -1572,14 +1572,14 @@ int ObSSTableRowIterator::open_cur_micro_block(ObSSTableReadHandle& read_handle,
       if (NULL == micro_scanner_) {
         // alloc scanner
         if (!sstable_->is_multi_version_minor_sstable()) {
    -      if (NULL == (buf = access_ctx_->allocator_->alloc(sizeof(ObMicroBlockRowScanner)))) {
    +      if (NULL == (buf = access_ctx_->stmt_allocator_->alloc(sizeof(ObMicroBlockRowScanner)))) {
             ret = OB_ALLOCATE_MEMORY_FAILED;
             STORAGE_LOG(WARN, "Fail to allocate memory for micro block scanner, ", K(ret));
           } else {
             micro_scanner_ = new (buf) ObMicroBlockRowScanner();
           }
         } else {
    -      if (NULL == (buf = access_ctx_->allocator_->alloc(sizeof(ObMultiVersionMicroBlockRowScanner)))) {
    +      if (NULL == (buf = access_ctx_->stmt_allocator_->alloc(sizeof(ObMultiVersionMicroBlockRowScanner)))) {
             ret = OB_ALLOCATE_MEMORY_FAILED;
             STORAGE_LOG(WARN, "Fail to allocate memory for micro block scanner, ", K(ret));
           } else {
    
    diff --git a/src/storage/memtable/ob_memtable.cpp b/src/storage/memtable/ob_memtable.cpp
    index ba7d295d..d1a02dc1 100644
    --- a/src/storage/memtable/ob_memtable.cpp
    +++ b/src/storage/memtable/ob_memtable.cpp
    @@ -1048,6 +1048,7 @@ int ObMemtable::get(const storage::ObTableIterParam& param, storage::ObTableAcce
       if (OB_FAIL(ret)) {
         if (NULL != get_iter_ptr) {
           get_iter_ptr->~ObMemtableGetIterator();
    +      context.stmt_allocator_->free(get_iter_ptr);
           get_iter_ptr = NULL;
         }
         TRANS_LOG(WARN, "get fail", K(ret), K_(key), K(param.table_id_));
    @@ -1139,6 +1140,7 @@ int ObMemtable::scan(const storage::ObTableIterParam& param, storage::ObTableAcc
         } else {
           if (NULL != scan_iter_ptr) {
             scan_iter_ptr->~ObIMemtableScanIterator();
    +        context.stmt_allocator_->free(scan_iter_ptr);
             scan_iter_ptr = NULL;
           }
           TRANS_LOG(
    @@ -1182,6 +1184,7 @@ int ObMemtable::multi_get(const storage::ObTableIterParam& param, storage::ObTab
       if (OB_FAIL(ret)) {
         if (NULL != mget_iter_ptr) {
           mget_iter_ptr->~ObMemtableMGetIterator();
    +      context.stmt_allocator_->free(mget_iter_ptr);
           mget_iter_ptr = NULL;
         }
         TRANS_LOG(WARN,
    @@ -1233,6 +1236,7 @@ int ObMemtable::multi_scan(const storage::ObTableIterParam& param, storage::ObTa
       if (OB_FAIL(ret)) {
         if (NULL != mscan_iter_ptr) {
           mscan_iter_ptr->~ObMemtableMScanIterator();
    +      context.stmt_allocator_->free(mscan_iter_ptr);
           mscan_iter_ptr = NULL;
         }
         TRANS_LOG(WARN,
    diff --git a/src/storage/ob_multiple_merge.cpp b/src/storage/ob_multiple_merge.cpp
    index f5c92405..6426010c 100644
    --- a/src/storage/ob_multiple_merge.cpp
    +++ b/src/storage/ob_multiple_merge.cpp
    @@ -993,7 +993,7 @@ int ObMultipleMerge::release_table_ref()
         STORAGE_LOG(WARN, "fail to check need refresh table", K(ret));
       } else if (need_refresh) {
         tables_handle_.reset();
    -    reuse_iter_array();
    +    reset_iter_array();
         is_tables_reset_ = true;
         STORAGE_LOG(INFO, "table need to be released", "table_id", access_param_->iter_param_.table_id_,
             K(*access_param_), K(curr_scan_index_));
    diff --git a/src/storage/ob_sstable_multi_version_row_iterator.cpp b/src/storage/ob_sstable_multi_version_row_iterator.cpp
    index 95b94b11..e295ccee 100644
    --- a/src/storage/ob_sstable_multi_version_row_iterator.cpp
    +++ b/src/storage/ob_sstable_multi_version_row_iterator.cpp
    @@ -57,10 +57,13 @@ void ObSSTableMultiVersionRowIterator::reset()
     
     void ObSSTableMultiVersionRowIterator::reuse()
     {
    -  ObISSTableRowIterator::reuse();
    +  ObISSTableRowIterator::reset();
    +  // ObISSTableRowIterator::reuse();
       query_range_ = NULL;
       if (NULL != iter_) {
    -    iter_->reuse();
    +    // iter_->reuse();
    +    iter_->~ObSSTableRowIterator();
    +    iter_ = NULL;
       }
       out_cols_cnt_ = 0;
       range_idx_ = 0;
    @@ -123,7 +126,7 @@ int ObSSTableMultiVersionRowGetter::inner_open(
         if (OB_FAIL(ObVersionStoreRangeConversionHelper::store_rowkey_to_multi_version_range(
                 *rowkey_, access_ctx.trans_version_range_, *access_ctx.allocator_, multi_version_range_))) {
           LOG_WARN("convert to multi version range failed", K(ret), K(*rowkey_));
    -    } else if (OB_FAIL(new_iterator<ObSSTableRowScanner>(*access_ctx.allocator_))) {
    +    } else if (OB_FAIL(new_iterator<ObSSTableRowScanner>(*access_ctx.stmt_allocator_))) {
           LOG_WARN("failed to new iterator", K(ret));
         } else if (OB_FAIL(iter_->init(iter_param, access_ctx, table, &multi_version_range_))) {
           LOG_WARN("failed to open scanner", K(ret));
    @@ -213,7 +216,7 @@ int ObSSTableMultiVersionRowScanner::inner_open(
         if (OB_FAIL(ObVersionStoreRangeConversionHelper::range_to_multi_version_range(
                 *range_, access_ctx.trans_version_range_, *access_ctx.allocator_, multi_version_range_))) {
           LOG_WARN("convert to multi version range failed", K(ret), K(*range_));
    -    } else if (OB_FAIL(new_iterator<ObSSTableRowScanner>(*access_ctx.allocator_))) {
    +    } else if (OB_FAIL(new_iterator<ObSSTableRowScanner>(*access_ctx.stmt_allocator_))) {
           LOG_WARN("failed to new iterator", K(ret));
         } else if (OB_FAIL(iter_->init(iter_param, access_ctx, table, &multi_version_range_))) {
           LOG_WARN("failed to open scanner", K(ret));
    @@ -306,7 +309,7 @@ int ObSSTableMultiVersionRowMultiGetter::inner_open(
             }
           }
           if (OB_FAIL(ret)) {
    -      } else if (OB_FAIL(new_iterator<ObSSTableRowMultiScanner>(*access_ctx.allocator_))) {
    +      } else if (OB_FAIL(new_iterator<ObSSTableRowMultiScanner>(*access_ctx.stmt_allocator_))) {
             LOG_WARN("failed to new iterator", K(ret));
           } else if (OB_FAIL(iter_->init(iter_param, access_ctx, table, &multi_version_ranges_))) {
             LOG_WARN("failed to open multi scanner", K(ret));
    @@ -431,7 +434,7 @@ int ObSSTableMultiVersionRowMultiScanner::inner_open(
           }
     
           if (OB_FAIL(ret)) {
    -      } else if (OB_FAIL(new_iterator<ObSSTableRowMultiScanner>(*access_ctx.allocator_))) {
    +      } else if (OB_FAIL(new_iterator<ObSSTableRowMultiScanner>(*access_ctx.stmt_allocator_))) {
             LOG_WARN("failed to new iterator", K(ret));
           } else if (OB_FAIL(iter_->init(iter_param, access_ctx, table, &multi_version_ranges_))) {
             LOG_WARN("failed to open scanner", K(ret));
    
    diff --git a/src/storage/ob_sstable_row_iterator.cpp b/src/storage/ob_sstable_row_iterator.cpp
    index cc0d2dd5..acc43774 100644
    --- a/src/storage/ob_sstable_row_iterator.cpp
    +++ b/src/storage/ob_sstable_row_iterator.cpp
    @@ -469,13 +469,13 @@ int ObSSTableRowIterator::inner_open(
         STORAGE_LOG(WARN, "Unexpected error, ", K(ret), K_(read_handle_cnt), K_(micro_handle_cnt));
       } else if (OB_FAIL(init_handle_mgr(iter_param, access_ctx, query_range))) {
         STORAGE_LOG(WARN, "fail to init handle mgr", K(ret), K(iter_param), K(access_ctx));
    -  } else if (OB_FAIL(read_handles_.reserve(*access_ctx.allocator_, read_handle_cnt_))) {
    +  } else if (OB_FAIL(read_handles_.reserve(*access_ctx.stmt_allocator_, read_handle_cnt_))) {
         STORAGE_LOG(WARN, "failed to reserve read handles", K(ret), K_(read_handle_cnt));
    -  } else if (OB_FAIL(micro_handles_.reserve(*access_ctx.allocator_, micro_handle_cnt_))) {
    +  } else if (OB_FAIL(micro_handles_.reserve(*access_ctx.stmt_allocator_, micro_handle_cnt_))) {
         STORAGE_LOG(WARN, "failed to reserve micro handles", K(ret), K_(micro_handle_cnt));
    -  } else if (OB_FAIL(sstable_micro_infos_.reserve(*access_ctx.allocator_, micro_handle_cnt_))) {
    +  } else if (OB_FAIL(sstable_micro_infos_.reserve(*access_ctx.stmt_allocator_, micro_handle_cnt_))) {
         STORAGE_LOG(WARN, "failed to reserve sstable micro infos", K(ret), K_(micro_handle_cnt));
    -  } else if (OB_FAIL(sorted_sstable_micro_infos_.reserve(*access_ctx.allocator_, micro_handle_cnt_))) {
    +  } else if (OB_FAIL(sorted_sstable_micro_infos_.reserve(*access_ctx.stmt_allocator_, micro_handle_cnt_))) {
         STORAGE_LOG(WARN, "failed to reserve sorted sstable micro infos", K(ret), K_(micro_handle_cnt));
       } else {
         sstable_ = static_cast<ObSSTable*>(table);
    
    diff --git a/src/storage/ob_multiple_multi_scan_merge.cpp b/src/storage/ob_multiple_multi_scan_merge.cpp
    index a7b2a571..55bdabd8 100644
    --- a/src/storage/ob_multiple_multi_scan_merge.cpp
    +++ b/src/storage/ob_multiple_multi_scan_merge.cpp
    @@ -228,7 +228,7 @@ int ObMultipleMultiScanMerge::construct_iters()
               iter->~ObStoreRowIterator();
               STORAGE_LOG(WARN, "Fail to push iter to iterator array, ", K(ret), K(i));
             }
    -      } else if (OB_ISNULL(iters_.at(tables.count() - 1 - i))) {
    +      } else if (OB_ISNULL(iter = iters_.at(tables.count() - 1 - i))) {
             ret = OB_ERR_UNEXPECTED;
             STORAGE_LOG(WARN, "Unexpected null iter", K(ret), "idx", tables.count() - 1 - i, K_(iters));
           } else if (OB_FAIL(iter->init(*iter_param, *access_ctx_, table, ranges_))) {
    
    diff --git a/src/storage/blocksstable/ob_micro_block_row_scanner.cpp b/src/storage/blocksstable/ob_micro_block_row_scanner.cpp
    index d6fd2648..cdc0297f 100644
    --- a/src/storage/blocksstable/ob_micro_block_row_scanner.cpp
    +++ b/src/storage/blocksstable/ob_micro_block_row_scanner.cpp
    @@ -445,7 +445,7 @@ int ObMicroBlockRowScanner::init(const ObTableIterParam& param, ObTableAccessCon
         STORAGE_LOG(WARN, "fail to get projector", K(ret));
       } else if (OB_FAIL(param_->get_column_map(false /*is get*/, column_id_map))) {
         STORAGE_LOG(WARN, "fail to get column id map", K(ret));
    -  } else if (OB_FAIL(column_map_.init(*context_->allocator_,
    +  } else if (OB_FAIL(column_map_.init(*context_->stmt_allocator_,
                      param_->schema_version_,
                      param_->rowkey_cnt_,
                      0, /*store count*/
    @@ -573,7 +573,7 @@ int ObMultiVersionMicroBlockRowScanner::init(
         STORAGE_LOG(WARN, "fail to get projector", K(ret));
       } else if (OB_FAIL(param_->get_column_map(context.use_fuse_row_cache_, column_id_map))) {
         STORAGE_LOG(WARN, "fail to get column id map", K(ret));
    -  } else if (OB_FAIL(column_map_.init(*context_->allocator_,
    +  } else if (OB_FAIL(column_map_.init(*context_->stmt_allocator_,
                      param_->schema_version_,
                      param_->rowkey_cnt_,
                      0, /*store count*/
    @@ -1358,7 +1358,7 @@ int ObMultiVersionMicroBlockMinorMergeRowScanner::init(
         // minor merge should contain 2
         if (OB_FAIL(build_minor_merge_out_cols(*param_, out_cols, expect_multi_version_col_cnt))) {
           STORAGE_LOG(WARN, "fail to build minor merge out columns", K(ret));
    -    } else if (OB_FAIL(column_map_.init(*context_->allocator_,
    +    } else if (OB_FAIL(column_map_.init(*context_->stmt_allocator_,
                        param_->schema_version_,
                        param_->rowkey_cnt_,
                        0, /*store count*/
    diff --git a/src/storage/memtable/ob_memtable.cpp b/src/storage/memtable/ob_memtable.cpp
    index d1a02dc1..94050470 100644
    --- a/src/storage/memtable/ob_memtable.cpp
    +++ b/src/storage/memtable/ob_memtable.cpp
    @@ -927,7 +927,7 @@ int ObMemtable::get(const storage::ObTableIterParam& param, storage::ObTableAcce
         const ColumnMap* param_column_map = nullptr;
         if (nullptr == row.row_val_.cells_) {
           if (nullptr ==
    -          (row.row_val_.cells_ = static_cast<ObObj*>(context.allocator_->alloc(sizeof(ObObj) * out_cols->count())))) {
    +          (row.row_val_.cells_ = static_cast<ObObj*>(context.stmt_allocator_->alloc(sizeof(ObObj) * out_cols->count())))) {
             ret = OB_ALLOCATE_MEMORY_FAILED;
             TRANS_LOG(WARN, "Fail to allocate memory, ", K(ret));
           } else {
    @@ -940,11 +940,11 @@ int ObMemtable::get(const storage::ObTableIterParam& param, storage::ObTableAcce
           TRANS_LOG(WARN, "fail to get column map", K(ret));
         } else if (NULL == param_column_map) {
           void* buf = NULL;
    -      if (NULL == (buf = context.allocator_->alloc(sizeof(ColumnMap)))) {
    +      if (NULL == (buf = context.stmt_allocator_->alloc(sizeof(ColumnMap)))) {
             ret = OB_ALLOCATE_MEMORY_FAILED;
             TRANS_LOG(WARN, "Fail to allocate memory, ", K(ret));
           } else {
    -        local_map = new (buf) ColumnMap(*context.allocator_);
    +        local_map = new (buf) ColumnMap(*context.stmt_allocator_);
             if (OB_FAIL(local_map->init(*out_cols))) {
               TRANS_LOG(WARN, "Fail to build column map, ", K(ret));
             }
    ```
    
- 复用handle mgr
    
    ObSSTableRowIterator中使用了block_handle_mgr_和block_index_handle_mgr_来缓存访问到的block_handle和block_index_handle，可以识别出rescan场景并且保持mgr一直有效。
    
    ```diff
    diff --git a/src/storage/ob_i_store.h b/src/storage/ob_i_store.h
    index 69971590..eb5274c9 100644
    --- a/src/storage/ob_i_store.h
    +++ b/src/storage/ob_i_store.h
    @@ -785,7 +785,7 @@ public:
     
     class ObStoreRowIterator : public ObIStoreRowIterator {
     public:
    -  ObStoreRowIterator() : type_(0)
    +  ObStoreRowIterator() : type_(0), is_rescan_(false)
       {}
       virtual ~ObStoreRowIterator()
       {}
    @@ -855,8 +855,14 @@ public:
       }
       VIRTUAL_TO_STRING_KV(K_(type));
     
    +  virtual void set_rescan_true()
    +  {
    +     is_rescan_ = true;
    +  }
    +
     protected:
       int type_;
    +  int is_rescan_;
     
     private:
       DISALLOW_COPY_AND_ASSIGN(ObStoreRowIterator);
    diff --git a/src/storage/ob_multiple_scan_merge.cpp b/src/storage/ob_multiple_scan_merge.cpp
    index 958c335e..130b53e9 100644
    --- a/src/storage/ob_multiple_scan_merge.cpp
    +++ b/src/storage/ob_multiple_scan_merge.cpp
    @@ -160,6 +160,9 @@ int ObMultipleScanMerge::construct_iters()
             }
             STORAGE_LOG(DEBUG, "[PUSHDOWN]", K_(consumer), K(iter->is_base_sstable_iter()));
             STORAGE_LOG(DEBUG, "add iter for consumer", KPC(table), KPC(access_param_));
    +        if (is_rescan()) {
    +          iter->set_rescan_true();
    +        }
           }
         }
     
    diff --git a/src/storage/ob_sstable_row_iterator.cpp b/src/storage/ob_sstable_row_iterator.cpp
    index a09c3e30..0fe498ae 100644
    --- a/src/storage/ob_sstable_row_iterator.cpp
    +++ b/src/storage/ob_sstable_row_iterator.cpp
    @@ -218,6 +218,7 @@ void ObISSTableRowIterator::reset()
       batch_rows_ = NULL;
       batch_row_count_ = 0;
       batch_row_pos_ = 0;
    +  is_rescan_ = false;
     }
     
     void ObISSTableRowIterator::reuse()
    @@ -428,7 +429,8 @@ ObSSTableRowIterator::ObSSTableRowIterator()
           io_micro_infos_(),
           micro_info_iter_(),
           prefetch_handle_depth_(DEFAULT_PREFETCH_HANDLE_DEPTH),
    -      prefetch_micro_depth_(DEFAULT_PREFETCH_MICRO_DEPTH)
    +      prefetch_micro_depth_(DEFAULT_PREFETCH_MICRO_DEPTH),
    +      hdr_flag_(0)
     {}
     
     ObSSTableRowIterator::~ObSSTableRowIterator()
    @@ -640,6 +642,7 @@ void ObSSTableRowIterator::reset()
       storage_file_ = nullptr;
       prefetch_handle_depth_ = DEFAULT_PREFETCH_HANDLE_DEPTH;
       prefetch_micro_depth_ = DEFAULT_PREFETCH_MICRO_DEPTH;
    +  hdr_flag_ = 0;
     }
     
     void ObSSTableRowIterator::reuse()
    @@ -666,8 +669,6 @@ void ObSSTableRowIterator::reuse()
       cur_range_idx_ = -1;
       io_micro_infos_.reuse();
       micro_info_iter_.reuse();
    -  block_index_handle_mgr_.reset();
    -  block_handle_mgr_.reset();
       table_store_stat_.reuse();
       skip_ctx_.reset();
       storage_file_ = nullptr;
    @@ -1683,6 +1684,29 @@ int ObSSTableRowIterator::init_handle_mgr(
         const ObTableIterParam& iter_param, ObTableAccessContext& access_ctx, const void* query_range)
     {
       int ret = OB_SUCCESS;
    +  if (is_rescan_) {
    +    if (hdr_flag_ == 0) {
    +      block_index_handle_mgr_.reset();
    +      block_handle_mgr_.reset();
    +      if (OB_FAIL(block_handle_mgr_.init(true, true, *access_ctx.stmt_allocator_))) {
    +        STORAGE_LOG(WARN, "failed to init block handle mgr", K(ret), K(true), K(true)); 
    +      } else if (OB_FAIL(block_index_handle_mgr_.init(true, true, *access_ctx.stmt_allocator_))) {
    +        STORAGE_LOG(WARN, "failed to init block index handle mgr", K(ret), K(true), K(true));
    +      }
    +      hdr_flag_ = 1;
    +    }
    +    return ret;
    +  } else {
    +    bool is_multi = false;
    +    bool is_ordered = false;
    +    if (!block_handle_mgr_.is_inited() && OB_FAIL(block_handle_mgr_.init(false, true, *access_ctx.stmt_allocator_))) {
    +      STORAGE_LOG(WARN, "failed to init block handle mgr", K(ret), K(is_multi), K(is_ordered)); 
    +    } else if (!block_index_handle_mgr_.is_inited() && OB_FAIL(block_index_handle_mgr_.init(false, is_ordered, *access_ctx.stmt_allocator_))) {
    +      STORAGE_LOG(WARN, "failed to init block index handle mgr", K(ret), K(is_multi), K(is_ordered));
    +    }
    +    return ret;
    +  }
    +  // never execute
       int64_t range_count = 0;
       bool is_multi = false;
       bool is_ordered = false;
    @@ -1703,9 +1727,9 @@ int ObSSTableRowIterator::init_handle_mgr(
                 range_count >= USE_HANDLE_CACHE_RANGE_COUNT_THRESHOLD);
       }
       if (OB_SUCC(ret)) {
    -    if (!block_handle_mgr_.is_inited() && OB_FAIL(block_handle_mgr_.init(false, true, *access_ctx.allocator_))) {
    -      STORAGE_LOG(WARN, "failed to init block handle mgr", K(ret), K(is_multi), K(is_ordered));
    -    } else if (!block_index_handle_mgr_.is_inited() && OB_FAIL(block_index_handle_mgr_.init(false, is_ordered, *access_ctx.allocator_))) {
    +    if (!block_handle_mgr_.is_inited() && OB_FAIL(block_handle_mgr_.init(false, true, *access_ctx.stmt_allocator_))) {
    +      STORAGE_LOG(WARN, "failed to init block handle mgr", K(ret), K(is_multi), K(is_ordered)); 
    +    } else if (!block_index_handle_mgr_.is_inited() && OB_FAIL(block_index_handle_mgr_.init(false, is_ordered, *access_ctx.stmt_allocator_))) {
           STORAGE_LOG(WARN, "failed to init block index handle mgr", K(ret), K(is_multi), K(is_ordered));
         }
       }
    diff --git a/src/storage/ob_sstable_row_iterator.h b/src/storage/ob_sstable_row_iterator.h
    index ebbbfc17..c6223425 100644
    --- a/src/storage/ob_sstable_row_iterator.h
    +++ b/src/storage/ob_sstable_row_iterator.h
    @@ -426,6 +426,7 @@ private:
       ObSSTableMicroBlockInfoIterator micro_info_iter_;
       int64_t prefetch_handle_depth_;
       int64_t prefetch_micro_depth_;
    +  int hdr_flag_;
     };
     
     }  // namespace storage
    
    diff --git a/src/storage/ob_micro_block_handle_mgr.cpp b/src/storage/ob_micro_block_handle_mgr.cpp
    index 028a2018..bb7f5e00 100644
    --- a/src/storage/ob_micro_block_handle_mgr.cpp
    +++ b/src/storage/ob_micro_block_handle_mgr.cpp
    @@ -45,6 +45,13 @@ void ObMicroBlockDataHandle::reset()
       io_handle_.reset();
     }
     
    +void ObMicroBlockDataHandle::reuse()
    +{
    +  block_index_ = -1;
    +  cache_handle_.reset();
    +  io_handle_.reset();
    +}
    +
     int ObMicroBlockDataHandle::get_block_data(
         ObMacroBlockReader& block_reader, ObStorageFile* storage_file, ObMicroBlockData& block_data)
     {
    @@ -104,7 +111,6 @@ int ObMicroBlockHandleMgr::get_micro_block_handle(const uint64_t table_id,
     {
       int ret = OB_SUCCESS;
       bool found = false;
    -  micro_block_handle.reset();
       if (IS_NOT_INIT) {
         ret = OB_NOT_INIT;
         STORAGE_LOG(WARN, "block handle mgr is not inited", K(ret));
    @@ -128,6 +134,7 @@ int ObMicroBlockHandleMgr::get_micro_block_handle(const uint64_t table_id,
         }
       }
       if (!found) {
    +    micro_block_handle.reuse();
         if (OB_FAIL(ObStorageCacheSuite::get_instance().get_block_cache().get_cache_block(
                 table_id, block_ctx.get_macro_block_id(), file_id, offset, size, micro_block_handle.cache_handle_))) {
           if (OB_ENTRY_NOT_EXIST != ret) {
    diff --git a/src/storage/ob_micro_block_handle_mgr.h b/src/storage/ob_micro_block_handle_mgr.h
    index 37f6d005..1ff90688 100644
    --- a/src/storage/ob_micro_block_handle_mgr.h
    +++ b/src/storage/ob_micro_block_handle_mgr.h
    @@ -30,6 +30,7 @@ struct ObMicroBlockDataHandle {
       ObMicroBlockDataHandle();
       virtual ~ObMicroBlockDataHandle();
       void reset();
    +  void reuse();
       int get_block_data(blocksstable::ObMacroBlockReader& block_reader, blocksstable::ObStorageFile* storage_file,
           blocksstable::ObMicroBlockData& block_data);
       TO_STRING_KV(
    diff --git a/src/storage/ob_micro_block_index_handle_mgr.cpp b/src/storage/ob_micro_block_index_handle_mgr.cpp
    index 83beb4e0..4e938a81 100644
    --- a/src/storage/ob_micro_block_index_handle_mgr.cpp
    +++ b/src/storage/ob_micro_block_index_handle_mgr.cpp
    @@ -37,6 +37,13 @@ void ObMicroBlockIndexHandle::reset()
       io_handle_.reset();
     }
     
    +void ObMicroBlockIndexHandle::reuse()
    +{
    +  block_index_mgr_ = NULL;
    +  cache_handle_.reset();
    +  io_handle_.reuse();
    +}
    +
     int ObMicroBlockIndexHandle::search_blocks(const ObStoreRange& range, const bool is_left_border,
         const bool is_right_border, ObIArray<ObMicroBlockInfo>& infos, const ObIArray<ObRowkeyObjComparer*>* cmp_funcs)
     {
    @@ -107,7 +114,6 @@ int ObMicroBlockIndexHandleMgr::get_block_index_handle(const uint64_t table_id,
     {
       int ret = OB_SUCCESS;
       bool found = false;
    -  block_idx_handle.reset();
       if (IS_NOT_INIT) {
         ret = OB_NOT_INIT;
         STORAGE_LOG(WARN, "index handle mgr is not inited", K(ret));
    @@ -127,6 +133,7 @@ int ObMicroBlockIndexHandleMgr::get_block_index_handle(const uint64_t table_id,
         }
       }
       if (!found) {
    +    block_idx_handle.reuse();
         if (OB_FAIL(ObStorageCacheSuite::get_instance().get_micro_index_cache().get_cache_block_index(
                 table_id, block_ctx.get_macro_block_id(), file_id, block_idx_handle.cache_handle_))) {
           if (OB_ENTRY_NOT_EXIST != ret) {
    diff --git a/src/storage/ob_micro_block_index_handle_mgr.h b/src/storage/ob_micro_block_index_handle_mgr.h
    index 2aea9dcf..89a19ac0 100644
    --- a/src/storage/ob_micro_block_index_handle_mgr.h
    +++ b/src/storage/ob_micro_block_index_handle_mgr.h
    @@ -23,6 +23,7 @@ struct ObMicroBlockIndexHandle {
       ObMicroBlockIndexHandle();
       virtual ~ObMicroBlockIndexHandle();
       void reset();
    +  void reuse();
       int search_blocks(const common::ObStoreRange& range, const bool is_left_border, const bool is_right_border,
           common::ObIArray<blocksstable::ObMicroBlockInfo>& infos,
           const common::ObIArray<ObRowkeyObjComparer*>* cmp_funcs = nullptr);
    ```
    
- 减少冗余的代码 & 逻辑优化（部分内容）
    
    prefetch数据预取逻辑冗余。
    
    ```cpp
    int ObSSTableRowIterator::inner_open(
        const ObTableIterParam& iter_param, ObTableAccessContext& access_ctx, ObITable* table, const void* query_range)
    {
    	...
    	else if (OB_FAIL(prefetch())) {
    	  STORAGE_LOG(WARN, "Fail to prefetch data, ", K(ret));
    	}
      ...
    }
    
    int ObMultipleGetMerge::construct_sstable_iter()
    {
    	for (int64_t i = 0; OB_SUCC(ret) && i < prefetch_cnt; ++i) {
        if (OB_FAIL(prefetch())) {
          STORAGE_LOG(WARN, "fail to prefetch", K(ret));
        }
      }
    	...
    }
    ```
    
    索引回表时去掉多余的reuse。
    
    ```cpp
    void ObTableScanStoreRowIterator::reuse_row_iters()
    {
      ...
    	if (NULL != index_merge_) {
    		index_merge_->reuse(); // 每次 rescan 都会进⾏ reuse
    	}
    	...
    }
    
    void ObIndexMerge::reuse()
    {
    // table_iter_.reuse(); 
    index_range_array_cursor_ = 0; }
    int ObIndexMerge::get_next_row(ObStoreRow*& row) {
     ......
    table_iter_.reuse(); // 在这⾥ reuse
    if (OB_FAIL(table_iter_.open(rowkeys_))) {
    ```
    
    优化refresh table on demand逻辑
    
    ```diff
    diff --git a/src/storage/ob_multiple_merge.cpp b/src/storage/ob_multiple_merge.cpp
    index 9aa5cb01..be8de75f 100644
    --- a/src/storage/ob_multiple_merge.cpp
    +++ b/src/storage/ob_multiple_merge.cpp
    @@ -922,7 +922,7 @@ int ObMultipleMerge::prepare_read_tables()
         }
     
         if (OB_SUCC(ret)) {
    -      relocate_cnt_ = access_ctx_->store_ctx_->mem_ctx_->get_relocate_cnt();
    +//      relocate_cnt_ = access_ctx_->store_ctx_->mem_ctx_->get_relocate_cnt();
           if (OB_UNLIKELY(nullptr != row_filter_)) {
             const ObPartitionKey& pkey = partition_store.get_partition_key();
             row_filter_ = tables_handle_.has_split_source_table(pkey) ? row_filter_ : NULL;
    @@ -987,24 +987,20 @@ int ObMultipleMerge::release_table_ref()
     int ObMultipleMerge::check_need_refresh_table(bool &need_refresh)
     {
       int ret = OB_SUCCESS;
    -  if (OB_UNLIKELY(!inited_)) {
    -    ret = OB_NOT_INIT;
    -    STORAGE_LOG(WARN, "ObMultipleMerge has not been inited", K(ret));
    +  if (NULL != access_ctx_->store_ctx_->mem_ctx_) {
    +    temp = relocate_cnt_;
    +    relocate_cnt_ = access_ctx_->store_ctx_->mem_ctx_->get_relocate_cnt();
    +    need_refresh = relocate_cnt_ > temp;
       } else {
    -    const bool relocated = NULL == access_ctx_->store_ctx_->mem_ctx_
    -                               ? false
    -                               : access_ctx_->store_ctx_->mem_ctx_->get_relocate_cnt() > relocate_cnt_;
    -    const bool memtable_retired = tables_handle_.check_store_expire();
    -    const int64_t relocate_cnt = access_ctx_->store_ctx_->mem_ctx_->get_relocate_cnt();
    -    need_refresh = relocated || memtable_retired;
    +    need_refresh = tables_handle_.check_store_expire();
    +  }
     #ifdef ERRSIM
    -    ret = E(EventTable::EN_FORCE_REFRESH_TABLE) ret;
    -    if (OB_FAIL(ret)) {
    -      ret = OB_SUCCESS;
    -      need_refresh = true;
    -    }
    -#endif
    +  ret = E(EventTable::EN_FORCE_REFRESH_TABLE) ret;
    +  if (OB_FAIL(ret)) {
    +    ret = OB_SUCCESS;
    +    need_refresh = true;
       }
    +#endif
       return ret;
     }
     
    diff --git a/src/storage/ob_multiple_merge.h b/src/storage/ob_multiple_merge.h
    index 12f8cdc2..ed227202 100644
    --- a/src/storage/ob_multiple_merge.h
    +++ b/src/storage/ob_multiple_merge.h
    @@ -164,6 +164,7 @@ class ObMultipleMerge : public ObQueryRowIterator {
       int64_t range_idx_delta_;
       ObGetTableParam get_table_param_;
       int64_t relocate_cnt_;
    +  int64_t temp;
       ObTableStoreStat table_stat_;
       bool skip_refresh_table_;
       bool read_memtable_only_;
    ```
    

## 正确性验证

---

修改代码的正确性是通过mysqltest运行测试样例来评定，OceanBase代码量庞大，逻辑复杂，自己做的修改难免会出现一些段错误之类的问题，这时候可以开vscode debug，在运行测试用例出错时就会catch住段错误的位置，方便找到问题的根源。

比如这个iter没有初始化的bug就是这样找出来的，改了代码以后会走到ObMultipleMultiScanMerge，mysqltest的测试样例正好测出了这个bug。

![Untitled](/auto-image/picrepo/24980b22-3ff2-4a3a-822e-95d2080a17da.png)
