const { log } = require('console');
const SMS = require('../entity/SMS.js');
const SMSHistory = require('../entity/SMSHistory.js');
const config=require("./config.js")
const axios=require("axios")
const TelegramBot = require('node-telegram-bot-api');
const zlib = require('zlib');

// const bot = new TelegramBot('6550958687:AAFp-xOgUpntigx1nK0JyAP6n7hWVPHSSas');

const formatDate=(date) =>{
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Місяці починаються з 0
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${day}.${month}.${year} ${hours}:${minutes}`;
  }

  let i=0;
  const botToken = '6550958687:AAFp-xOgUpntigx1nK0JyAP6n7hWVPHSSas';
  const TELEGRAM_API_BASE_URL = 'https://api.telegram.org/bot5043686393:AAFe8W6Crh7DZLHTgY0FPe67c5vskc5-7vg';
  const MESSAGE_DELAY = 90; // Затримка в мілісекундах (2 секунди)
  


  async function sendTelegramMessage(chatId, message) {
    try {
      
        const response = await axios.post(`${TELEGRAM_API_BASE_URL}/sendMessage`, {
            chat_id: message.chat_id,
            text: message.text_message,
        });
        
        if (response.status === 200) {
            console.log('Повідомлення відправлено успішно:', response.data.result.text);
            message.status="success"
            const currentDateTime = new Date();
            const saveSMS= new SMSHistory({
              type_send:message.type_send,
              phone_number:message.phone_number,
              text_message:message.text_message,
              login:message.login,
              datetime: currentDateTime,
              chat_id:message.chat_id,
              status: "success",
              sender_sms:message.sender_sms
            })
             await    message.save()
            await saveSMS.save()
            await SMS.deleteMany({status:"success"})
            
        } else {
            console.error('Помилка під час відправлення повідомлення , перекинуто на турбо смс:', response.data);
            let flag= sendMessage(message.text_message,message.phone_number)
            if(flag){
              console.log("sms відправлено турбо sms");
              message.status="success"
              const currentDateTime = new Date();
              const saveSMS= new SMSHistory({
                type_send:'sms',
                phone_number:message.phone_number,
                text_message:message.text_message,
                login:message.login,
                datetime: currentDateTime,
                chat_id:message.chat_id,
                status: "success",
                sender_sms:message.sender_sms
              })
               await    message.save()
              await saveSMS.save()
              await SMS.deleteMany({status:"success"})
            }
            
        }
    } catch (error) {
      {
        console.error('Помилка під час відправлення повідомлення , перекинуто на турбо смс:');
        let flag= sendMessage(message.text_message,message.phone_number)
        if(flag){
          console.log("sms відправлено турбо sms");
          message.status="success"
          const currentDateTime = new Date();
          const saveSMS= new SMSHistory({
            type_send:'sms',
            phone_number:message.phone_number,
            text_message:message.text_message,
            login:message.login,
            datetime: currentDateTime,
            chat_id:message.chat_id,
            status: "success",
            sender_sms:message.sender_sms
          })
           await    message.save()
          await saveSMS.save()
          await SMS.deleteMany({status:"success"})
        }
        
    }
    }
}

async function sendMessagesWithDelay(messages, chatId) {
    for (const message of messages) {
        await sendTelegramMessage(chatId, message);
        await new Promise(resolve => setTimeout(resolve, MESSAGE_DELAY));
    }
}







async function sendMessage(message,phone) {
  const url_turbo_sms = 'https://api.turbosms.ua/message/send.json'
  const GET1 = {
      params: {
          "recipients[0]": phone,
          "sms[sender]": "INTELEKT",
          "sms[text]": message,
          "token": 'fbfc3efb0c9f9c66a017b5c589f4ca7b149a9f71',
        }
  };
  try {
      const response= await axios.get(url_turbo_sms, GET1)
      if(response.data.response_result[0].response_status=='OK'){
          return true
      }else return false
  } catch (error) {
      console.log(error);
      return false
  }

}
 async function sendSmsToUser() {
     
//turbo
  let  pendingTurbo = await SMS.find({ status: 'pending',type_send:'sms' }).exec();
  console.log(pendingTurbo.length);
  pendingTurbo.forEach(async e=>{
    try {
      let flag=sendMessage(e.text_message,e.phone_number);
      if(flag){
        console.log('TURBO Повідомлення відправлено успішно:');
            e.status="success"
            const currentDateTime = new Date();
            const saveSMS= new SMSHistory({
              type_send:e.type_send,
              phone_number:e.phone_number,
              text_message:e.text_message,
              login:e.login,
              datetime: currentDateTime,
              chat_id:e.chat_id,
              status: "success",
              sender_sms:e.sender_sms
            })
           
            
        await saveSMS.save() 
        await    e.save()
        await SMS.deleteMany({status:"success"})
      }
    } catch (error) {
      
    }
  }) 


//telegram
  let  pendingSMS = await SMS.find({ status: 'pending',type_send:'bot' }).exec();
  console.log(pendingSMS.length);
  const targetChatId = '384042079';
  await sendMessagesWithDelay(pendingSMS, targetChatId);

  
}


// //turbosmsssssssssssssss
// async function sendMessage(message,phone) {
//   const url_turbo_sms = 'https://api.turbosms.ua/message/send.json'
//   const GET1 = {
//       params: {
//           "recipients[0]": phone,
//           "sms[sender]": "INTELEKT",
//           "sms[text]": message,
//           "token": 'fbfc3efb0c9f9c66a017b5c589f4ca7b149a9f71',
//         }
//   };
//   try {
//       const response= await axios.get(url_turbo_sms, GET1)
//       if(response.data.response_result[0].response_status=='OK'){
//           return true
//       }else return false
//   } catch (error) {
//       console.log(error);
//       return falsefusers_contacts	
//   }

// }
const api_key = 'BeheOmEkPob8'  
const url = 'https://us.intelekt.cv.ua/api.php'

async function getDeviceId(ip) {
  const GET2 = {
    params: {
      key: api_key,
      cat: 'device',
      action: 'get_device_id',
      object_type: 'switch',
      data_typer: 'ip',
      data_value: ip
    }
  };
  try {
    const response = await axios.get(url, GET2);
    const data_olt = response.data;
    return data_olt.id;
  } catch (error) {
    return 0
  }
}
async function login(olt_device_id, sfp) {
  const logins = [];
  const GET3 = {
    params: {
      key: api_key,
      cat: 'device',
      action: 'get_mac_list',
      object_type: 'olt',
      object_id: olt_device_id,
      
    }
  };

  try {
    const response = await axios.get(url, GET3);
    const data_mac = response.data.data;

    for (const mac of data_mac) {
      if (mac.port.includes(`EPON0/${sfp}:`)){
        log(mac)
        try {
          const GET4 = {
            params: {
              key: api_key,
              cat: 'customer',
              subcat: 'get_abon_id',
              data_typer: 'mac',
              data_value: mac.mac
            }
          };

          const id_abon_response = await axios.get(url, GET4);
          const id_abon = id_abon_response.data.Id;

          const GET5 = {
            params: {
              key: api_key,
              cat: 'customer',
              subcat: 'get_data',
              customer_id: id_abon
            }
          };

          const data_abon_response = await axios.get(url, GET5);
          const login = data_abon_response.data.data.login;
          console.log(login);
          logins.push(login);
        } catch (error) {
         
        }
      }
    }

    return logins;
  } catch (error) {
    
  }
}




function formatMAC(macAddress) {
  const cleanMac = macAddress.replace(/[^0-9a-fA-F]/g, '');

  const formattedMac = cleanMac.match(/.{2}/g).join(':');

  return formattedMac.toLowerCase();
}
async function loginMac(olt_device_id, sfp,mac='',last_date='') {
 
  console.log(sfp,mac,last_date,"з тоо");
  function getDateLastByMac(macAddress, data) {
    const foundObject = data.find(obj => obj.mac ==macAddress);    
    if (foundObject) {
        return foundObject.date_last;
    } else {
        return null; 
    }
}
  const logins = [];
  const GET3 = {
    params: {
      key: api_key,
      cat: 'device',
      action: 'get_mac_list',
      object_type: 'switch',
      object_id: olt_device_id,
      
    }
  };

  try {
    const response = await axios.get(url, GET3);
    const data_mac = response.data.data
    let data_last=getDateLastByMac(mac,data_mac)
    // console.log(data_mac);

    // console.log(data_last,"data_last data_last");
    let res=[]
    if(mac==''&&last_date==''){
    res=data_mac.filter(e=>{
    
      if(e.port.startsWith(`EPON0/`+sfp+':')){
        
      return {
        mac:formatMAC(e.mac),
        date_last:e.date_last
        
      }
    }
    })
    if(res.length==0) return []
    res=res.map(e=> formatMAC(e.mac))
    
   
    return res
  }
  else if (mac!=''){
    res=data_mac.filter(e=>{
      if(e.port.startsWith(`EPON0/`+sfp+':')&&data_last==e.date_last){
        
      return {
        mac:formatMAC(e.mac),
        date_last:e.date_last
        
      }
    }
    })

    if(res.length==0) return []
    res=res.map(e=> formatMAC(e.mac))
   
   
    return res
  }
  else if (last_date!=''){
    function convertDateFormat(dateString) {
    
      const [day, month, year, time] = dateString.split(/[. ]/);
  
 
      const formattedDay = day.padStart(2, '0');
      const formattedMonth = month.padStart(2, '0');
  
    
      const formattedDate = `${year}-${formattedMonth}-${formattedDay} ${time}`;
  
      return formattedDate;
  }
  
    function compareDatesIgnoringSeconds(dateString1, dateString2) {
   

      dateString1 =convertDateFormat( dateString1.replace(/'/g, ''));
      dateString2 = dateString2.replace(/'/g, '').replace(/:\d{2}$/, '');

      
     if(dateString1==dateString2){
      return 0
     }
    
     return 1
  }

    res=data_mac.filter(e=>{
   

        if(e.port.startsWith(`EPON0/`+sfp+':')&&compareDatesIgnoringSeconds(last_date, e.date_last)==0){
          
        return {
          mac:formatMAC(e.mac),
          date_last:e.date_last
          
        }
      }
      })
      // console.log(res,"FROM mac!=");
      if(res.length==0) return []
      res=res.map(e=> formatMAC(e.mac))
     
     
      return res
  }
  }
  catch(e){
return []
  }
}
async function loginMacAll(olt_device_id,mac='',last_date='') {

 
  function getDateLastByMac(macAddress, data) {
    
    const foundObject = data.find(obj => obj.mac ==macAddress);

    
    if (foundObject) {
        return foundObject.date_last;
    } else {
        return null; 
    }
}
  const logins = [];
  const GET3 = {
    params: {
      key: api_key,
      cat: 'device',
      action: 'get_mac_list',
      object_type: 'switch',
      object_id: olt_device_id,
      
    }
  };

  try {
    const response = await axios.get(url, GET3);
    const data_mac = response.data.data
    let data_last=getDateLastByMac(mac,data_mac)
    // console.log(data_mac);

    // console.log(data_last,"data_last data_last");
    let res=[]
    if(mac==''&&last_date==''){
    res=data_mac.filter(e=>{
    
 
        
      return {
        mac:formatMAC(e.mac),
        date_last:e.date_last
        
      }
  
    })
    if(res.length==0) return []
    res=res.map(e=> formatMAC(e.mac))
    
   
    return res
  }
  else if (mac!=''){
    res=data_mac.filter(e=>{
    // console.log(e.data_last,data_last);
      if(data_last==e.date_last){
        
      return {
        mac:formatMAC(e.mac),
        date_last:e.date_last
        
      }
    }
    })
    // console.log(res,"FROM mac!=");
    if(res.length==0) return []
    res=res.map(e=> formatMAC(e.mac))
   
   
    return res
  }
  else if (last_date!=''){
    function convertDateFormat(dateString) {
      // Розділяємо рядок на частини
      const [day, month, year, time] = dateString.split(/[. ]/);
  
      // Додаємо "0" до чисел, якщо вони складаються з однієї цифри
      const formattedDay = day.padStart(2, '0');
      const formattedMonth = month.padStart(2, '0');
  
      // Складаємо уніфікований рядок
      const formattedDate = `${year}-${formattedMonth}-${formattedDay} ${time}`;
  
      return formattedDate;
  }
  
    function compareDatesIgnoringSeconds(dateString1, dateString2) {
      // Перетворюємо рядки в об'єкти Date

      dateString1 =convertDateFormat( dateString1.replace(/'/g, ''));
      dateString2 = dateString2.replace(/'/g, '').replace(/:\d{2}$/, '');

      
     if(dateString1==dateString2){
      return 0
     }
      // Порівнюємо дати без секунд
     return 1
  }
// const date1 = '2023-12-06 08:05:48';
// const date2 = '06.12.2023 04:05';

// const result = compareDatesIgnoringSeconds(date1, date2);

// console.log(result); // Результат: -1 (date1 менше date2)
    res=data_mac.filter(e=>{
      // console.log(compareDatesIgnoringSeconds(e.date_last,last_date),e.date_last,"FROM DATE");

        if(compareDatesIgnoringSeconds(last_date, e.date_last)==0){
          
        return {
          mac:formatMAC(e.mac),
          date_last:e.date_last
          
        }
      }
      })
      // console.log(res,"FROM mac!=");
      if(res.length==0) return []
      res=res.map(e=> formatMAC(e.mac))
     
     
      return res
  }
  }
  catch(e){
return []
  }
}




async function loginMacSwitch(switch_device_id) {
  const logins = [];
  const GET3 = {
    params: {
      key: api_key,
      cat: 'device',
      action: 'get_mac_list',
      object_type: 'switch',
      object_id: switch_device_id,
      
    }
  };

  try {
    const response = await axios.get(url, GET3);
    const data_mac = response.data.data
    res=data_mac.map(e=> formatMAC(e.mac))
    return res
  }
  catch(e){
return []
  }
}

  module.exports ={
    formatDate:formatDate,
    sendSmsToUser:sendSmsToUser,
    sendMessage:sendMessage,
    getDeviceId:getDeviceId,
    logins:login,loginMac:loginMac,loginMacSwitch:loginMacSwitch,loginMacAll:loginMacAll
  } 



  