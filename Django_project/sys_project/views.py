import json
import requests
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from wechatpy import WeChatClient, parse_message
from wechatpy.utils import check_signature
from wechatpy.exceptions import InvalidSignatureException
from wechatpy.replies import TextReply


WECHAT_APPID = 'wxf674e92f5701611a'
WECHAT_SECRET = 'ZEbTHtyivrD3eJ02OQvlqGMzSTL81h3PpCEDkcIekps'
WECHAT_TOKEN = '17630767260'

RASA_SERVER_URL = 'http://localhost:5005'

wechat_client = WeChatClient(WECHAT_APPID, WECHAT_SECRET)

@csrf_exempt
def wechat(request):
    if request.method == "GET":
        signature = request.GET.get("signature", "")
        timestamp = request.GET.get("timestamp", "")
        nonce = request.GET.get("nonce", "")
        echo_str = request.GET.get("echostr", "")

        try:
            check_signature(WECHAT_TOKEN, signature, timestamp, nonce)
        except InvalidSignatureException:
            return HttpResponse("Invalid signature")

        return HttpResponse(echo_str)
    elif request.method == "POST":
        message = parse_message(request.body)
        if message.type == "text":
            reply = TextReply()
            reply.source = message.target
            reply.target = message.source
            # todo
            reply.content = message.content
            print("message.target----------------------------------------：：",message.target)
            print("message.source----------------------------------------：：",message.source)
            print("message.content----------------------------------------：：",message.content)
            response = requests.post(
                f"{RASA_SERVER_URL}/webhooks/rest/webhook",
                json={"sender": message.source, "message": message.content},
            )

            rasa_response = response.json()
            reply.content = rasa_response[0]["text"]

            reply.type = message.type
            return HttpResponse(reply.render())
        else:
            return HttpResponse("success")

@csrf_exempt
def react_rq(request):
    print("request----------------------------------------：：", request.method)
    if request.method == "OPTIONS":
        # 预检请求，浏览器会先发 OPTIONS 请求，询问服务器是否允许跨域请求
        response = HttpResponse("CORS preflight response")
        # 设置 CORS 响应头
        response["Access-Control-Allow-Origin"] = "*"  # 允许所有来源
        response["Access-Control-Allow-Methods"] = "POST, GET, OPTIONS"  # 允许的方法
        response["Access-Control-Allow-Headers"] = "Content-Type"  # 允许的请求头
        return response

    elif request.method == "GET":
        # 处理 GET 请求
        signature = request.GET.get("signature", "")
        timestamp = request.GET.get("timestamp", "")
        nonce = request.GET.get("nonce", "")
        echo_str = request.GET.get("echostr", "")

        try:
            check_signature(WECHAT_TOKEN, signature, timestamp, nonce)
        except InvalidSignatureException:
            return HttpResponse("Invalid signature")

        return HttpResponse(echo_str)

    elif request.method == "POST":
        # 解码字节串为 UTF-8 字符串
        decoded_body = request.body.decode('utf-8')
        # 打印解码后的请求体（字符串）
        print("Decoded request body----------------------------------------：：", decoded_body)
        # {"sender":"1734720021029-1vfcwg4bq","message":"是法国史蒂夫尬死的风格"}
        data = json.loads(decoded_body)
        sender = data.get("sender")
        message = data.get("message")
        response = requests.post(
            f"{RASA_SERVER_URL}/webhooks/rest/webhook",
            json={"sender": sender, "message": message},
        )

        rasa_response = response.json()

        reply = {
            "type": "text",
            "content": rasa_response[0]["text"]
        }
        # 将字典转换为 JSON 字符串
        json_data = json.dumps(reply, ensure_ascii=False)

        print("rasa回复",json_data)
        # 返回 RASA 回复给前端
        return HttpResponse(json_data)