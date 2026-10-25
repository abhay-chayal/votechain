# Single-node Hadoop 3.3.6 + Hive 3.1.3 + PySpark 3.5 for the VoteChain BDA module.
# HDFS, YARN, MapReduce (with Python streaming), the JobHistory server and Hive all run in
# one container, which is enough to demonstrate the full pipeline on a laptop.
FROM eclipse-temurin:8-jdk-jammy

ENV HADOOP_VERSION=3.3.6 \
    HIVE_VERSION=3.1.3 \
    HADOOP_HOME=/opt/hadoop \
    HIVE_HOME=/opt/hive \
    HADOOP_CONF_DIR=/opt/hadoop/etc/hadoop \
    PYSPARK_PYTHON=python3
ENV PATH=$PATH:$HADOOP_HOME/bin:$HADOOP_HOME/sbin:$HIVE_HOME/bin

RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 python3-pip curl procps \
 && rm -rf /var/lib/apt/lists/*

# Hadoop (fast mirror first, archive as a fallback).
RUN (curl -fsSL https://dlcdn.apache.org/hadoop/common/hadoop-${HADOOP_VERSION}/hadoop-${HADOOP_VERSION}.tar.gz -o /tmp/hadoop.tgz \
     || curl -fsSL https://archive.apache.org/dist/hadoop/common/hadoop-${HADOOP_VERSION}/hadoop-${HADOOP_VERSION}.tar.gz -o /tmp/hadoop.tgz) \
 && tar -xzf /tmp/hadoop.tgz -C /opt && mv /opt/hadoop-${HADOOP_VERSION} $HADOOP_HOME && rm /tmp/hadoop.tgz \
 && rm -rf $HADOOP_HOME/share/doc

# Hive. Hive 3.1.3 ships an older Guava than Hadoop 3.3.6, which breaks at startup,
# so it is swapped for Hadoop's copy (a well-known compatibility fix).
RUN curl -fsSL https://archive.apache.org/dist/hive/hive-${HIVE_VERSION}/apache-hive-${HIVE_VERSION}-bin.tar.gz -o /tmp/hive.tgz \
 && tar -xzf /tmp/hive.tgz -C /opt && mv /opt/apache-hive-${HIVE_VERSION}-bin $HIVE_HOME && rm /tmp/hive.tgz \
 && rm -f $HIVE_HOME/lib/guava-*.jar \
 && cp $HADOOP_HOME/share/hadoop/common/lib/guava-*.jar $HIVE_HOME/lib/ \
 && rm -f $HIVE_HOME/lib/log4j-slf4j-impl-*.jar

RUN pip3 install --no-cache-dir pyspark==3.5.3 pandas==2.2.3 matplotlib==3.9.2

COPY conf/core-site.xml conf/hdfs-site.xml conf/mapred-site.xml conf/yarn-site.xml $HADOOP_CONF_DIR/
COPY conf/hive-site.xml $HIVE_HOME/conf/
COPY start.sh /start.sh

# Hadoop refuses to start daemons as root unless told which user runs each one.
RUN { echo "export JAVA_HOME=$JAVA_HOME"; \
      for u in HDFS_NAMENODE_USER HDFS_DATANODE_USER HDFS_SECONDARYNAMENODE_USER YARN_RESOURCEMANAGER_USER YARN_NODEMANAGER_USER MAPRED_HISTORYSERVER_USER; do echo "export $u=root"; done; \
    } >> $HADOOP_CONF_DIR/hadoop-env.sh \
 && sed -i 's/\r$//' /start.sh && chmod +x /start.sh

# 9870 HDFS NameNode UI · 8088 YARN ResourceManager UI · 19888 MapReduce JobHistory UI
EXPOSE 9870 8088 19888
WORKDIR /work
CMD ["/start.sh"]
