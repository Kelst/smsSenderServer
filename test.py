import requests
import json

api_key = 'BeheOmEkPob8'  
url = 'https://us.intelekt.cv.ua/api.php'
def get_device_id(ip):
        GET2 = {
        'key': api_key,
        'cat': 'device',
        'action': 'get_device_id',
        'object_type' : 'switch', #switch
        'data_typer' : 'ip', #switch
        'data_value' : ip,
        }
        get_data_device = requests.get(url, GET2) #take list id_login
        print(get_data_device)
        data_olt = json.loads(get_data_device.text)
        # bot.send_message(chat_id, str(data_olt))
        return(data_olt['id'])


print(get_device_id('172.16.45.4'))