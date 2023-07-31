#!/usr/bin/env python
# -*- coding; utf-8 -*-

# In[1]:

from flask import Flask, render_template,request
import pyspark
import pandas
import json
from pyspark.sql.session import SparkSession
from pyspark.sql.context import SQLContext
from pyspark.sql.types import StructType
from pyspark.context import SparkContext, SparkConf
from pyspark.ml.feature import VectorAssembler
from pyspark.ml.classification import LogisticRegressionModel
import mysql.connector
import datetime

app =  Flask(__name__)

# In[2]:


sparkconf= SparkConf().setAppName('project_display').setMaster('spark://master:7077')
sc = SparkContext.getOrCreate(conf=sparkconf)
sc.stop()


# In[3]:


spark = SparkSession.builder.master("spark://master:7077").appName("project_display").getOrCreate()


# In[4]:


disease_data = spark.read.csv('hdfs://master:9000/heart_disease_dataset/',header = True, inferSchema = True)


# In[5]:


pandas_disease_df = disease_data.toPandas()
pandas_disease_df['Age'] = pandas_disease_df['Age'].astype(int)
pandas_disease_df['Chestpain'] = pandas_disease_df['Chestpain'].astype(int)
pandas_disease_df['RestingBP'] = pandas_disease_df['RestingBP'].astype(int)
pandas_disease_df['RestingECG'] = pandas_disease_df['RestingECG'].astype(int)
pandas_disease_df['MaxHR'] = pandas_disease_df['MaxHR'].astype(int)
pandas_disease_df['Exercise'] = pandas_disease_df['Exercise'].astype(int)
pandas_disease_df['HeartDisease'] = pandas_disease_df['HeartDisease'].astype(int)
pandas_disease_df['Cholesterol'] = pandas_disease_df['Cholesterol'].astype(int)
pandas_disease_df['SusceptibilityIndex'] = pandas_disease_df['SusceptibilityIndex'].astype(int)



# In[6]:





# In[11]:





@app.route('/',methods=['GET'])
def index():
	return render_template('index.html')

@app.route('/',methods=['POST'])
def ps():
	pandas_df = pandas_disease_df.sample(frac=0.50)
	disease_data = spark.createDataFrame(pandas_df)
	required_features = ['Age',
                     'Chestpain',
                    'RestingBP',
                     'Cholesterol',
                     'RestingECG',
                     'MaxHR',
                     'Exercise',
                     'HeartDisease'
                   ]



	assembler = VectorAssembler(inputCols=required_features, outputCol='features')

	transformed_data = assembler.transform(disease_data)
	(training_data, test_data) = transformed_data.randomSplit([0.9,0.1])
	lr = LogisticRegressionModel.load('hdfs://master:9000/lrmodel')
	lr_predictions = lr.transform(transformed_data)
	lr_pred_pandas_df = lr_predictions.toPandas()
	pand = lr_pred_pandas_df.iloc[:,0:12]
	pand1 = pand.sort_values(by='SusceptibilityIndex')
	#print(pand1)
	data=[]
	for i in pand1.values:
		i=list(i)
		data.append(i)
	data=data[len(data)-11:len(data)-1]
	data.reverse()
	json.dumps(data)
	return render_template('generator.html',data=data)
	
@app.route('/sub2',methods=['POST'])
def ps2():
	pandas_df = pandas_disease_df.sample(frac=0.50)
	disease_data = spark.createDataFrame(pandas_df)
	required_features = ['Age',
                     'Chestpain',
                    'RestingBP',
                     'Cholesterol',
                     'RestingECG',
                     'MaxHR',
                     'Exercise',
                     'HeartDisease'
                   ]



	assembler = VectorAssembler(inputCols=required_features, outputCol='features')

	transformed_data = assembler.transform(disease_data)
	(training_data, test_data) = transformed_data.randomSplit([0.9,0.1])
	lr = LogisticRegressionModel.load('hdfs://master:9000/lrmodel')
	lr_predictions = lr.transform(transformed_data)
	lr_pred_pandas_df = lr_predictions.toPandas()
	pand = lr_pred_pandas_df.iloc[:,0:12]
	pand1 = pand.sort_values(by='SusceptibilityIndex')
	#print(pand1)
	data=[]
	for i in pand1.values:
		i=list(i)
		data.append(i)
	data=data[len(data)-21:len(data)-1]
	data.reverse()
	json.dumps(data)
	return render_template('generator.html',data=data)


@app.route('/sql',methods=['GET'])
def sq():
	conn = mysql.connector.connect(
    	host='localhost',
    	port=3306,
    	user='root',
    	password='hduser1234',
    	database='patient'
	)
	cursor = conn.cursor()
	query = "SELECT * FROM details"
	cursor.execute(query)
	rows=cursor.fetchall()
	print(rows)
	conn.commit()
	conn.close()
	return 'ok'

@app.route('/sql1',methods=['POST'])
def sq1():	
	data=request.json
	a=data['key']
	j=[]
	for i in a:
		j.append(i.split("|"))
		
	ct = datetime.datetime.now()
	tm=str(ct)
	conn = mysql.connector.connect(
    	host='localhost',
    	port=3306,
    	user='root',
    	password='hduser1234',
    	database='patient'
	)
	cursor = conn.cursor()
	query = "INSERT INTO timestamps VALUES ('"+tm+"')"

	cursor.execute(query)
	conn.commit()
	query = 'CREATE TABLE `'+tm+'` (ID VARCHAR(100),NAME VARCHAR (200), AGE INTEGER, SEX VARCHAR(20), CHESTPAIN INTEGER, RESTINGBP INTEGER, CHOLESTEROL INTEGER, RESTINGECG INTEGER, MAXHR INTEGER, EXERCISE INTEGER, HEARTHDISEASE INTEGER, SUSCEPTIBILITY INTEGER)'
	cursor.execute(query)
	conn.commit()
	for val in j:
		query="INSERT INTO `"+tm+"` VALUES ('?', '?', ?, '?', ?, ?, ?, ?, ?, ?, ?,?)"
		query=query.replace("?",val[1],1).replace("?",val[2],1).replace("?",val[3],1).replace("?",val[4],1).replace("?",val[5],1).replace("?",val[6],1).replace("?",val[7],1).replace("?",val[8],1).replace("?",val[9],1).replace("?",val[10],1).replace("?",val[11],1).replace("?",val[12],1)
		cursor.execute(query)
		conn.commit()
	conn.close()
	return '<script>alert("Data successfully logged")</script> '

@app.route('/sql2',methods=['POST'])
def sq2():	
	data=request.json
	a=data['key']
	j=[]
	for i in a:
		j.append(i.split("|"))
		
	ct = datetime.datetime.now()
	tm=str(ct)
	conn = mysql.connector.connect(
    	host='localhost',
    	port=3306,
    	user='root',
    	password='hduser1234',
    	database='patient'
	)
	cursor = conn.cursor()
	query = "INSERT INTO timestamps VALUES ('"+tm+"')"

	cursor.execute(query)
	conn.commit()
	query = 'CREATE TABLE `'+tm+'` (ID VARCHAR(100),NAME VARCHAR (200), AGE INTEGER, SEX VARCHAR(20), CHESTPAIN INTEGER, RESTINGBP INTEGER, CHOLESTEROL INTEGER, RESTINGECG INTEGER, MAXHR INTEGER, EXERCISE INTEGER, HEARTHDISEASE INTEGER, SUSCEPTIBILITY INTEGER)'
	cursor.execute(query)
	conn.commit()
	for val in j:
		query="INSERT INTO `"+tm+"` VALUES ('?', '?', ?, '?', ?, ?, ?, ?, ?, ?, ?,?)"
		query=query.replace("?",val[1],1).replace("?",val[2],1).replace("?",val[3],1).replace("?",val[4],1).replace("?",val[5],1).replace("?",val[6],1).replace("?",val[7],1).replace("?",val[8],1).replace("?",val[9],1).replace("?",val[10],1).replace("?",val[11],1).replace("?",val[12],1)
		cursor.execute(query)
		conn.commit()
	conn.close()
	return '<script>alert("Data successfully logged")</script> '

@app.route('/sqlogs',methods=['POST'])
def logger():
	conn = mysql.connector.connect(
    	host='localhost',
    	port=3306,
    	user='root',
    	password='hduser1234',
    	database='patient'
	)
	cursor = conn.cursor()
	query = "SELECT * FROM timestamps"
	cursor.execute(query)
	rows=cursor.fetchall()
	timestamps=[]
	finaldata=[]
	for i in rows:
		timestamps.append(i[0])
	for i in timestamps:
		query = "SELECT * FROM `"+i+"`"
		cursor.execute(query)
		rows=cursor.fetchall()
		finaldata.append(["LOGS RECORDED AT TIMESTAMP: "+i,'-','-','-','-','-','-','-','-','-','-','-',])
		for i in rows:
			finaldata.append(i)
		
		
	conn.close()
	json.dumps(finaldata)
	return render_template('sqlogs.html',data=finaldata)

app.run()









