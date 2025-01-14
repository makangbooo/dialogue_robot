基于React + python + Rasa的电商客服机器人

# XJU电商配置相关

## 1、Rasa

```shell
# rasa 的conda环境：
conda create --name rasaDemo python=3.10 -y

pip install uv
# 先换镜像？
uv pip install rasa-pro

# 配置lisence

rasa init
rasa train
rasa run

# 启动
nohup rasa run
nohup rasa run actions
```

## 2、Django

```shell

# 1、启动项目（开发）
nohup python manage.py runserver 0.0.0.0:80

# 2、启动项目（测试）
uwsgi --http 0.0.0.0:80 --file medical_project/wsgi.py --static-map=statistic=statistic

# 3、启动项目（生产）
uwsgi --ini uwsgi.ini
sudo systemctl start nginx



# linux关掉正在运行的django:
# 1、开发环境
	ps aux | grep manage.py
	kill -9 PID
# 2、生产/测试 环境
	ps -ef |grep -i uwsgi
	kill -9 PID

	sudo systemctl stop nginx




# 查看日志
tail -f /var/log/nginx/access.log

120.55.74.137:80/webhooks/rest/webhook",

```



## 3、uwsj

```shell
[uwsgi]



# 项目目录位置
chdir = /mkb/mkbDjangoTest/medical_project/

# 启动uwsgi的用户名和用户组
uid=root
gid=root

# 指定项目的application
module = medical_project.wsgi:application

# 指定sock的文件路径 (use the full path to be safe)
socket = /mkb/mkbDjangoTest/medical_project/script/uwsgi.sock

# 启动主进程
master = true
processes = 4
threads = 2


# 进程个数
workers = 2
pidfile = /mkb/mkbDjangoTest/medical_project/script/uwsgi.pid

# 在退出uwsgi环境后，清空环境变量
vacuum = true



# 启用线程
enable-threads = true

# 设置自动中断时间
harakiri = 30

# 设置缓冲
post-buffering = 512


# 设置日志。daemonize the uWSGI process (background)
daemonize = /mkb/mkbDjangoTest/medical_project/script/uwsgi.log
```

## 4、ssl证书

```shel
    server {
        listen       3000 ssl;
        http2 on;
        server_name 10.109.118.31;
        
        # 注意路径用你真实的路径，也支持绝对路径
        ssl_certificate      ssl/server.cer;
        ssl_certificate_key  ssl/server.key;
        ssl_protocols TLSv1.2 TLSv1.3;
    }






openssl req -x509 -newkey rsa:4096 -keyout /home/xjus/mkbssl/private.key -out /home/xjus/mkbssl/certificate.crt -days 365

openssl rsa -in /home/xjus/mkbssl/private.key -out /home/xjus/mkbssl/private_no_pass.key



/home/xjus/mkbssl/certificate.crt

/Users/makangbo/code/privateCode/chat_xjuSpeech/chat_xju_speech
```



