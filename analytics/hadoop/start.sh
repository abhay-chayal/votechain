#!/bin/bash
# Starts the single-node Hadoop cluster and prepares Hive. Runs as the container's main process.
set -e

if [ ! -d /data/hadoop/name/current ]; then
  echo "[start] Formatting HDFS (first run only)"
  hdfs namenode -format -nonInteractive -force
fi

echo "[start] Starting HDFS, YARN and the JobHistory server"
hdfs --daemon start namenode
hdfs --daemon start datanode
yarn --daemon start resourcemanager
yarn --daemon start nodemanager
mapred --daemon start historyserver

hdfs dfsadmin -safemode wait
hdfs dfs -mkdir -p /tmp /tmp/hive /user/hive/warehouse /votechain
hdfs dfs -chmod -R 777 /tmp /user/hive/warehouse

if [ ! -d /data/hive/metastore_db ]; then
  echo "[start] Creating the Hive metastore (first run only)"
  mkdir -p /data/hive
  schematool -dbType derby -initSchema
fi

echo "[start] READY  HDFS: http://localhost:9870  YARN: http://localhost:8088  JobHistory: http://localhost:19888"
# Keep the container alive and show daemon logs.
exec tail -n 0 -F $HADOOP_HOME/logs/*.log
