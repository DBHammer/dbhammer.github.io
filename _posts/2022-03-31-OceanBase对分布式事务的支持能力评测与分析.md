---
title: OceanBase对分布式事务的支持能力评测与分析
tags: join
author: 瞿璐祎
member: 瞿璐祎
---

## 一、目的

- 分布式数据库的一大设计目标是通过增加分布式节点来提高数据库的性能，如吞吐。但是分布式环境给事务处理带来的优势有可能会由于分布式事务的产生而削弱，甚至会造成性能的恶化。本文主要评测OceanBase对分布式事务的支持能力以及OceanBase提出的tablegroup技术对分布式事务执行性能产生的影响。


## 二、初探TPC-C中NewOrder事务

- 在*TPC-C*中，*NewOrder*事务负责下订单任务，它会在*Stock*表中更新5-15个items的库存。*NewOrder*事务会有1%的概率更新远程的仓库的*Stock*信息，因此会产生1%的分布式事务。*NewOrder*的事务模板如下所示。

  ```sql
  TX[NewOrder]
  SELECT C_DISCOUNT, C_LAST, C_CREDIT FROM CUSTOMER WHERE C_W_ID = ? AND C_D_ID = ? AND C_ID = ?;
  SELECT W_TAX FROM WAREHOUSE WHERE W_ID = ?;
  SELECT D_NEXT_O_ID, D_TAX FROM DISTRICT WHERE D_W_ID = ? AND D_ID = ? FOR UPDATE;
  UPDATE DISTRICT SET D_NEXT_O_ID = D_NEXT_O_ID + 1 WHERE D_W_ID = ? AND D_ID = ?;
  INSERT INTO OORDER (O_ID, O_D_ID, O_W_ID, O_C_ID, O_ENTRY_D, O_OL_CNT, O_ALL_LOCAL) VALUES (?, ?, ?, ?, ?, ? , ?);
  INSERT INTO NEW_ORDER (NO_O_ID, NO_D_ID, NO_W_ID) VALUES ( ?, ?, ?);
  Multiple
  SELECT I_PRICE, I_NAME, I_DATA FROM ITEM WHERE I_ID = ?; C_DISCOUNT
  SELECT S_QUANTITY, S_DATA, S_DIST_01, S_DIST_02, S_DIST_03, S_DIST_04, S_DIST_05, S_DIST_06, S_DIST_07, S_DIST_08, S_DIST_09, S_DIST_10 FROM STOCK WHERE S_I_ID = ? AND S_W_ID = ? FOR UPDATE;
  //此处有1%的可能s_w_id != w_id，从而产生分布式事务
  UPDATE STOCK SET S_QUANTITY = ?, S_YTD = S_YTD + ?, S_ORDER_CNT = S_ORDER_CNT + 1, S_REMOTE_CNT = S_REMOTE_CNT + ? WHERE S_I_ID = ? AND S_W_ID = ?;
  INSERT INTO ORDER_LINE (OL_O_ID, OL_D_ID, OL_W_ID, OL_NUMBER, OL_I_ID, OL_SUPPLY_W_ID, OL_QUANTITY, OL_AMOUNT, OL_DIST_INFO) VALUES (?,?,?, ?,?,?,?,?,?);
  EndMultiple
  EndTX 
  ```

- 为了分析OceanBase对分布式事务的支持能力，我们将分布式事务比例进行参数化，将它分别设为1%，10%，20%，40%，80%和100%。关于BenchmarkSQL的代码修改见实验配置。

## 三、实验准备

- (必选) BenchmarkSQL运行TPC-C中的NewOrder事务，为了合理设置分布式事务比例，对NewOrder事务做了略微的改动，改动内容以及benchmarkSQL的配置参数在下方。
- （必须）OceanBase v3.1.2版本

## 四、实验配置

### 1. 机器配置

- 为测试分布式事务的影响，本次实验将OceanBase部署在10台机器上。其中9台机器的配置为：8核CPU，32G内存，上面各部署了一个OBServer；其中1台机器的配置为：16核CPU, 16G内存，上面部署了一个OBProxy，同时也作为实验的客户端。

- 下面介绍了我们的集群配置情况，对BenchmarkSQL修订的内容和配置文件。运行BenchmarkSQL对OceanBase的系统变量和用户变量的调整见官网。
- 本实验中使用的是mysql mode，需要将BenchmarkSQL和OceanBase适配，可见官网。

### 2. OceanBase集群配置

```shell
## Only need to configure when remote login is required
user:
  username: xxx
  password: xxx
  #key_file: .ssh/authorized_keys
oceanbase-ce:
  servers:
    - name: host1
      ip: 10.24.14.8
    - name: host2
      ip: 10.24.14.136
    - name: host3
      ip: 10.24.14.75
    - name: host4
      ip: 10.24.14.178
    - name: host5
      ip: 10.24.14.60
    - name: host6
      ip: 10.24.14.120
    - name: host7
      ip: 10.24.14.126
    - name: host8
      ip: 10.24.14.171
    - name: host9
      ip: 10.24.14.181
  global:
    devname: eth0
    cluster_id: 1
    memory_limit: 28G
    system_memory: 8G
    stack_size: 512K
    cpu_count: 16
    cache_wash_threshold: 1G
    __min_full_resource_pool_memory: 268435456
    workers_per_cpu_quota: 10
    schema_history_expire_time: 1d
    net_thread_count: 4
    major_freeze_duty_time: Disable
    minor_freeze_times: 10
    enable_separate_sys_clog: 0
    enable_merge_by_turn: FALSE
    datafile_disk_percentage: 35
    syslog_level: WARN
    enable_syslog_recycle: true
    max_syslog_file_count: 4
    appname: ob209
  host1:
    mysql_port: 2883
    rpc_port: 2882
    home_path: /data/obdata
    zone: zone0
  host2:
    mysql_port: 2883
    rpc_port: 2882
    home_path: /data/obdata
    zone: zone0
  host3:
    mysql_port: 2883
    rpc_port: 2882
    home_path: /data/obdata
    zone: zone0
  host4:
    mysql_port: 2883
    rpc_port: 2882
    home_path: /data/obdata
    zone: zone1
  host5:
    mysql_port: 2883
    rpc_port: 2882
    home_path: /data/obdata
    zone: zone1
  host6:
    mysql_port: 2883
    rpc_port: 2882
    home_path: /data1/obdata
    zone: zone1
  host7:
    mysql_port: 2883
    rpc_port: 2882
    home_path: /data1/obdata
    zone: zone2
  host8:
    mysql_port: 2883
    rpc_port: 2882
    home_path: /data1/obdata
    zone: zone2
  host9:
    mysql_port: 2883
    rpc_port: 2882
    home_path: /data1/obdata
    zone: zone2

obproxy:
  servers:
    - 10.24.14.215
  global:
    listen_port: 2883
    home_path: /data/obproxy
    rs_list: 10.24.14.8:2883;10.24.14.136:2883;10.24.14.75:2883;10.24.14.178:2883;10.24.14.60:2883;10.24.14.120:2883;10.24.14.126:2883;10.24.14.171:2883;10.24.14.181:2883
    enable_cluster_checkout: false
    cluster_name: ob209
```
### 3. BenchmarkSQL修改内容和配置文件

#### 3.1 BenchmarkSQL下载链接

```sql
  https://sourceforge.net/projects/benchmarksql/files/latest/download
```
#### 3.2 BenchmarkSQL修改内容

  - 修改benchmark-5.0/src/client/jTPCC.java 文件，增加分布式事务比例的参数化

     ```java
     private double tpmC;
     private jTPCCRandom rnd;
     private OSCollector osCollector = null;
     //声明neworder事务中的分布式事务比例
     private static double newOrderDistributedRate;
     ```

     ```java
     String  iWarehouses  = getProp(ini,"warehouses");
     String  iTerminals  = getProp(ini,"terminals");
     //获取配置文件参数
     newOrderDistributedRate = Double.parseDouble(getProp(ini, "newOrderDistributedRate"));
     
     String  iRunTxnsPerTerminal = ini.getProperty("runTxnsPerTerminal");
     String iRunMins  =  ini.getProperty("runMins");
     ```

     ```java
     private String getFileNameSuffix()
     {
     	SimpleDateFormat dateFormat = new SimpleDateFormat("yyyyMMddHHmmss");
     	return dateFormat.format(new java.util.Date());
         }
     
     //创建外部类的访问接口
     public static double getNewOrderDistributedRate() {
     		return newOrderDistributedRate;
     	}
     ```

  2. 修改benchmark-5.0/src/client/jTPCCTData.java 文件，修改NewOrder的分布式事务比例

     ```java
     while (i < o_ol_cnt)                    // 2.4.1.5
     	{
     	  newOrder.ol_i_id[i]         = rnd.getItemID();
     		//更改分布式事务比例
     	   if (rnd.nextInt(1, 100) <= 100-jTPCC.getNewOrderDistributedRate()*100)
     		newOrder.ol_supply_w_id[i] = terminalWarehouse;
     	    else
     		newOrder.ol_supply_w_id[i] = rnd.nextInt(1, numWarehouses);
     	    newOrder.ol_quantity[i] = rnd.nextInt(1, 10);
     
     ```

- 	修改benchmark-5.0/run/probs.ob文件

     ```shell
     db=oracle
     driver=com.alipay.oceanbase.obproxy.mysql.jdbc.Driver
     conn=jdbc:oceanbase://10.24.14.188:2883/tpcc_100?useUnicode=true&characterEncoding=utf-8
     user=tpcc@test
     password=
     
     warehouses=100
     loadWorkers=30
     
     terminals=100
     //To run specified transactions per terminal- runMins must equal zero
     runTxnsPerTerminal=0
     //To run for specified minutes- runTxnsPerTerminal must equal zero
     runMins=5
     //Number of total transactions per minute
     limitTxnsPerMin=0
     
     //将生成的数据放在该目录
     fileLocation=/data/ob/tpcc_100/
     
     //Distributed Transaction Ratio For NewOrder Transaction
     newOrderDistributedRate=0.01
     
     //Set to true to run in 4.x compatible mode. Set to false to use the
     //entire configured database evenly.
     terminalWarehouseFixed=false
     
     //The following five values must add up to 100
     newOrderWeight=100
     paymentWeight=0
     orderStatusWeight=0
     deliveryWeight=0
     stockLevelWeight=0
     
     // Directory name to create for collecting detailed result data.
     // Comment this out to suppress.
     resultDirectory=my_result_%tY-%tm-%td_%tH%tM%tS
     osCollectorScript=./misc/os_collector_linux.py
     osCollectorInterval=1
     
     ```

- 修改benchmark-5.0/run/sql.oceanbase/tableCreates.sql 文件

     ```sql
     create table bmsql_config (
       cfg_name    varchar(30) primary key,
       cfg_value   varchar(50)
     );
     
     create tablegroup tpcc_group binding true partition by hash partitions 128;
     
     create table bmsql_warehouse (
       w_id        integer   not null,
       w_ytd       decimal(12,2),
       w_tax       decimal(4,4),
       w_name      varchar(10),
       w_street_1  varchar(20),
       w_street_2  varchar(20),
       w_city      varchar(20),
       w_state     char(2),
       w_zip       char(9),
       primary key(w_id)
     )tablegroup='tpcc_group' partition by hash(w_id) partitions 128;
     
     create table bmsql_district (
       d_w_id       integer       not null,
       d_id         integer       not null,
       d_ytd        decimal(12,2),
       d_tax        decimal(4,4),
       d_next_o_id  integer,
       d_name       varchar(10),
       d_street_1   varchar(20),
       d_street_2   varchar(20),
       d_city       varchar(20),
       d_state      char(2),
       d_zip        char(9),
       PRIMARY KEY (d_w_id, d_id)
     )tablegroup='tpcc_group' partition by hash(d_w_id) partitions 128;
     
     create table bmsql_customer (
       c_w_id         integer        not null,
       c_d_id         integer        not null,
       c_id           integer        not null,
       c_discount     decimal(4,4),
       c_credit       char(2),
       c_last         varchar(16),
       c_first        varchar(16),
       c_credit_lim   decimal(12,2),
       c_balance      decimal(12,2),
       c_ytd_payment  decimal(12,2),
       c_payment_cnt  integer,
       c_delivery_cnt integer,
       c_street_1     varchar(20),
       c_street_2     varchar(20),
       c_city         varchar(20),
       c_state        char(2),
       c_zip          char(9),
       c_phone        char(16),
       c_since        timestamp,
       c_middle       char(2),
       c_data         varchar(500),
       PRIMARY KEY (c_w_id, c_d_id, c_id)
     )tablegroup='tpcc_group' partition by hash(c_w_id) partitions 128;
     
     
     create table bmsql_history (
       hist_id  integer,
       h_c_id   integer,
       h_c_d_id integer,
       h_c_w_id integer,
       h_d_id   integer,
       h_w_id   integer,
       h_date   timestamp,
       h_amount decimal(6,2),
       h_data   varchar(24)
     )tablegroup='tpcc_group' partition by hash(h_w_id) partitions 128;
     
     create table bmsql_new_order (
       no_w_id  integer   not null ,
       no_d_id  integer   not null,
       no_o_id  integer   not null,
       PRIMARY KEY (no_w_id, no_d_id, no_o_id)
     )tablegroup='tpcc_group' partition by hash(no_w_id) partitions 128;
     
     create table bmsql_oorder (
       o_w_id       integer      not null,
       o_d_id       integer      not null,
       o_id         integer      not null,
       o_c_id       integer,
       o_carrier_id integer,
       o_ol_cnt     integer,
       o_all_local  integer,
       o_entry_d    timestamp,
       PRIMARY KEY (o_w_id, o_d_id, o_id)
     )tablegroup='tpcc_group' partition by hash(o_w_id) partitions 128;
     
     create table bmsql_order_line (
       ol_w_id         integer   not null,
       ol_d_id         integer   not null,
       ol_o_id         integer   not null,
       ol_number       integer   not null,
       ol_i_id         integer   not null,
       ol_delivery_d   timestamp,
       ol_amount       decimal(6,2),
       ol_supply_w_id  integer,
       ol_quantity     integer,
       ol_dist_info    char(24),
       PRIMARY KEY (ol_w_id, ol_d_id, ol_o_id, ol_number)
     )tablegroup='tpcc_group' partition by hash(ol_w_id) partitions 128;
     
     create table bmsql_item (
       i_id     integer      not null,
       i_name   varchar(24),
       i_price  decimal(5,2),
       i_data   varchar(50),
       i_im_id  integer,
       PRIMARY KEY (i_id)
     ) locality='F,R{all_server}@zone0, F,R{all_server}@zone1, F,R{all_server}@zone2'  duplicate_scope='cluster';
     -- );
     
     create table bmsql_stock (
       s_w_id       integer       not null,
       s_i_id       integer       not null,
       s_quantity   integer,
       s_ytd        integer,
       s_order_cnt  integer,
       s_remote_cnt integer,
       s_data       varchar(50),
       s_dist_01    char(24),
       s_dist_02    char(24),
       s_dist_03    char(24),
       s_dist_04    char(24),
       s_dist_05    char(24),
       s_dist_06    char(24),
       s_dist_07    char(24),
       s_dist_08    char(24),
       s_dist_09    char(24),
       s_dist_10    char(24),
       PRIMARY KEY (s_w_id, s_i_id)
     )tablegroup='tpcc_group' partition by hash(s_w_id) partitions 128;
     
     ```

     

     

## 五、实验过程

### 1. 创建schema并在本地生成数据文件

```shell
cd benchmark-5.0/run
./runDatabaseBuild.sh props.ob
```
### 2. 导入数据

- 这里采用的是外部load infile方式导入数据库，因为我们导入的数据量比较大，这种方式更加快速。首先，需要将生成的数据文件如customer.csv等移动到rootserver所在的机器上，我们这边放在10.24.14.245(rootserver)上的/data/ob/tpcc_100/目录。此外，schema的创建方式

```shell
obclient -h10.24.14.245 -P2883 -uroot@test -c  -D tpcc_100 -e "load data /*+ parallel(80) */ infile '/data/ob/tpcc_100/warehouse.csv' into table bmsql_warehouse fields terminated by ',';"  
obclient -h10.24.14.245 -P2883 -uroot@test -c  -D tpcc_100 -e "load data /*+ parallel(80) */ infile '/data/ob/tpcc_100/district.csv' into table bmsql_district fields terminated by ',';"  
obclient -h10.24.14.245 -P2883 -uroot@test -c  -D tpcc_100 -e "load data /*+ parallel(80) */ infile '/data/ob/tpcc_100/config.csv' into table bmsql_config fields terminated by ',';" 
obclient -h10.24.14.245 -P2883 -uroot@test -c  -D tpcc_100 -e "load data /*+ parallel(80) */ infile '/data/ob/tpcc_100/item.csv' into table bmsql_item fields terminated by ',';"  
obclient -h10.24.14.245 -P2883 -uroot@test -c  -D tpcc_100 -e "load data /*+ parallel(80) */ infile '/data/ob/tpcc_100/order.csv' into table bmsql_oorder fields terminated by ',';"  
obclient -h10.24.14.245 -P2883 -uroot@test -c  -D tpcc_100 -e "load data /*+ parallel(80) */ infile '/data/ob/tpcc_100/stock.csv' into table bmsql_stock fields terminated by ',';" 
obclient -h10.24.14.245 -P2883 -uroot@test -c  -D tpcc_100 -e "load data /*+ parallel(80) */ infile '/data/ob/tpcc_100/cust-hist.csv' into table bmsql_history fields terminated by ',';" 
obclient -h10.24.14.245 -P2883 -uroot@test -c  -D tpcc_100 -e "load data /*+ parallel(80) */ infile '/data/ob/tpcc_100/new-order.csv' into table bmsql_new_order fields terminated by ',';" 
obclient -h10.24.14.245 -P2883 -uroot@test -c  -D tpcc_100 -e "load data /*+ parallel(80) */ infile '/data/ob/tpcc_100/order-line.csv' into table bmsql_order_line fields terminated by ',';" 
obclient -h10.24.14.245 -P2883 -uroot@test -c  -D tpcc_100 -e "load data /*+ parallel(80) */ infile '/data/ob/tpcc_100/customer.csv' into table bmsql_customer fields terminated by ',';" 
```
### 3. 分布式事务比例实验的运行负载

实验中分别将newOrderDistributedRate设为0.01，0.1，0.2，0.4，0.6，0.8，1 分别代表不同的NewOrder事务的分布式事务比例

```sql
./runBenchmark.sh probs.ob
```


## 六、实验结果展示与分析

- 我们将上方运行的分布式事务的实验结果列在下方，横坐标是不同的分布式事务比例，纵坐标是每分钟的吞吐数。我们可以观察到，分布式事务比例从0.01一直到1，吞吐从188639下降到64699，下降了65.7%。实验结果符合我们的预期，分布式事务对分布式数据库的性能会造成比较大的影
  响。
- 为了尽量减少分布式事务比例的影响，OceanBase其实提出了tablegroup机制，它能让经常被一起访问的记录尽可能地放在用一个partition中。比如，一个歌手名下有多张唱片，那么如果一个事务更新歌手及其名下的唱片，那么将该歌手和其唱片放在一起，就可以减少分布式事务。OceanBase中的tablegroup机制就是基于这样的想法创建出来的，为了验证tablegroup机制提升性能的效果，我们将去掉原始的tablegroup机制，来看性能下降了多少。  

![imgalt](/auto-image/picrepo/b4c987fe-f308-492b-aa36-399ecede06b7.png)


## 七、进一步实验

- 为了完成这个实验，需要修改benchmark-5.0/run/sql.oceanbase/tableCreates.sql 文件。

  ```sql
  create table bmsql_config (
    cfg_name    varchar(30) primary key,
    cfg_value   varchar(50)
  );
  
  
  create table bmsql_warehouse (
    w_id        integer   not null,
    w_ytd       decimal(12,2),
    w_tax       decimal(4,4),
    w_name      varchar(10),
    w_street_1  varchar(20),
    w_street_2  varchar(20),
    w_city      varchar(20),
    w_state     char(2),
    w_zip       char(9),
    primary key(w_id)
  )partition by hash(w_id) partitions 128;
  
  create table bmsql_district (
    d_w_id       integer       not null,
    d_id         integer       not null,
    d_ytd        decimal(12,2),
    d_tax        decimal(4,4),
    d_next_o_id  integer,
    d_name       varchar(10),
    d_street_1   varchar(20),
    d_street_2   varchar(20),
    d_city       varchar(20),
    d_state      char(2),
    d_zip        char(9),
    PRIMARY KEY (d_w_id, d_id)
  )partition by hash(d_w_id) partitions 128;
  
  create table bmsql_customer (
    c_w_id         integer        not null,
    c_d_id         integer        not null,
    c_id           integer        not null,
    c_discount     decimal(4,4),
    c_credit       char(2),
    c_last         varchar(16),
    c_first        varchar(16),
    c_credit_lim   decimal(12,2),
    c_balance      decimal(12,2),
    c_ytd_payment  decimal(12,2),
    c_payment_cnt  integer,
    c_delivery_cnt integer,
    c_street_1     varchar(20),
    c_street_2     varchar(20),
    c_city         varchar(20),
    c_state        char(2),
    c_zip          char(9),
    c_phone        char(16),
    c_since        timestamp,
    c_middle       char(2),
    c_data         varchar(500),
    PRIMARY KEY (c_w_id, c_d_id, c_id)
  )partition by hash(c_w_id) partitions 128;
  
  
  create table bmsql_history (
    hist_id  integer,
    h_c_id   integer,
    h_c_d_id integer,
    h_c_w_id integer,
    h_d_id   integer,
    h_w_id   integer,
    h_date   timestamp,
    h_amount decimal(6,2),
    h_data   varchar(24)
  )partition by hash(h_w_id) partitions 128;
  
  create table bmsql_new_order (
    no_w_id  integer   not null ,
    no_d_id  integer   not null,
    no_o_id  integer   not null,
    PRIMARY KEY (no_w_id, no_d_id, no_o_id)
  )partition by hash(no_w_id) partitions 128;
  
  create table bmsql_oorder (
    o_w_id       integer      not null,
    o_d_id       integer      not null,
    o_id         integer      not null,
    o_c_id       integer,
    o_carrier_id integer,
    o_ol_cnt     integer,
    o_all_local  integer,
    o_entry_d    timestamp,
    PRIMARY KEY (o_w_id, o_d_id, o_id)
  )partition by hash(o_w_id) partitions 128;
  
  create table bmsql_order_line (
    ol_w_id         integer   not null,
    ol_d_id         integer   not null,
    ol_o_id         integer   not null,
    ol_number       integer   not null,
    ol_i_id         integer   not null,
    ol_delivery_d   timestamp,
    ol_amount       decimal(6,2),
    ol_supply_w_id  integer,
    ol_quantity     integer,
    ol_dist_info    char(24),
    PRIMARY KEY (ol_w_id, ol_d_id, ol_o_id, ol_number)
  )partition by hash(ol_w_id) partitions 128;
  
  create table bmsql_item (
    i_id     integer      not null,
    i_name   varchar(24),
    i_price  decimal(5,2),
    i_data   varchar(50),
    i_im_id  integer,
    PRIMARY KEY (i_id)
  ) locality='F,R{all_server}@zone0, F,R{all_server}@zone1, F,R{all_server}@zone2'  duplicate_scope='cluster';
  -- );
  
  create table bmsql_stock (
    s_w_id       integer       not null,
    s_i_id       integer       not null,
    s_quantity   integer,
    s_ytd        integer,
    s_order_cnt  integer,
    s_remote_cnt integer,
    s_data       varchar(50),
    s_dist_01    char(24),
    s_dist_02    char(24),
    s_dist_03    char(24),
    s_dist_04    char(24),
    s_dist_05    char(24),
    s_dist_06    char(24),
    s_dist_07    char(24),
    s_dist_08    char(24),
    s_dist_09    char(24),
    s_dist_10    char(24),
    PRIMARY KEY (s_w_id, s_i_id)
  )partition by hash(s_w_id) partitions 128;
  
  ```

- 为了简化实验，这边将props.ob中的变量newOrderDistributedRate=0.01

- 加载数据&运行负载

- 实验展示与分析

  - 我们将运行的实验结果列在下方，横坐标是两种不同的schema方法，纵坐标表是NewOrder事务的每分钟的吞吐。我们可以看到不建立tablegroup的时候，吞吐为61977，而建立tablegroup之后，吞吐提高了3倍左右，为188639。可见，OceanBase提供的tablegroup机制能大大提升性能。 
  
![imgalt](/auto-image/picrepo/475c03c0-3083-4eeb-a4d2-942b246ae6f5.png)

## 八、总结

- 经过上方的实验，我们可以将OceanBase在分布式事务的支持能力上的实验表现总结为两点：
  - 在良好分区下，OceanBase能提供非常高的吞吐，表现十分优异。随着分布式事务比例的增长，OceanBase的性能会呈现下降的趋势，这也是大多数分布式事务型数据库所面临的难题和挑战[^1][^2]。
  - OceanBase所提供的tablegroup技术能够迎合业务的需求，就数据和业务进行良好的绑定。在我们的实验中，加入tablegroup机制让整个吞吐上升了整整3倍。

## 参考文献

[^1]:<span name = "ref1">Pavlo A, Curino C, Zdonik S. Skew-aware automatic database partitioning in shared-nothing, parallel OLTP systems[C]//Proceedings of the 2012 ACM SIGMOD International Conference on Management of Data. 2012: 61-72.</span>
[^2]:L. Qu, Q. Wang, T. Chen, K. Li, R. Zhang, X. Zhou, Q. Xu, Z. Yang, C. Yang, W. Qian, and A. Zhou, “Are current benchmarks adequate to evaluate distributed transactional databases?” BenchCouncil Transactions on Benchmarks, Standards and Evaluations, vol. 2, no. 1,p. 100031, 2022. [Online]. Available: https://www.sciencedirect.com/science/article/pii/S2772485922000187  