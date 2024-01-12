const express = require('express');
const app = express();
const http = require('http');
const { Server } = require("socket.io");
const zlib = require('zlib');
const excel = require('exceljs');
const axios=require("axios")
const bodyParser = require('body-parser');
const format = require('date-fns/format');

const mysql = require('mysql2');
const config = require('./config.js'); // Подключите свой конфигурационный файл
const cors = require('cors'); // Подключаем пакет cors
const mongoose = require('mongoose');
const SMS = require('./entity/SMS.js');
const SMSHistory = require('./entity/SMSHistory.js');
const {formatDate,sendSmsToUser,logins,getDeviceId, loginMac, loginMacSwitch, loginMacAll, sendMessage}=require("./tools/tools.js")
const compression = require('compression'); // Додали пакет compression
const { log } = require('console');
const Shablon = require('./entity/Shablon.js');
const queryDatabaseBilling = require('./tools/connectBilling.js');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.raw({ type: 'application/octet-stream' })); // Приймати RAW дані

app.use(bodyParser.json({ limit: '100mb' }));
app.use(cors());
app.use(compression());
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*'); // Дозвіл з будь-якого джерела
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});
const port = 3001; 


const dbConfig = {
  host: config.host,
  user: config.user,
  password: config.password,
  database: config.db
};


// const connection = mysql.createConnection(dbConfig);

    
// connection.connect((err) => {
//   if (err) {
//     console.error('Error connecting to database:', err);
//   } else {
//     console.log('Connected to database');
//   }
// });
async function getListUidNameBuyTariffId(tariff_id) {
  let tariff_tp_id=0;
  const sqlTar=`SELECT tp_id FROM tarif_plans where id='${tariff_id}' `
  const resp=await queryDatabaseBilling(sqlTar)
  
  const sql = `SELECT u.id, i.uid
              FROM internet_main i
              JOIN users u ON i.uid = u.uid
              WHERE i.tp_id = ${resp[0].tp_id}`;

   return queryDatabaseBilling(sql)
}
async function getListUidNameBuyGroupId(group_id) {


  
  const sql = `select id,uid from users where gid='${group_id}'`;


  return queryDatabaseBilling(sql)
 
}
async function getListCity() {
  const sql = `SELECT name from districts `;

   return queryDatabaseBilling(sql)
}



async function getListUidNameBuyMAC(query) {
  

  return queryDatabaseBilling(query)
}

async function getListTariff() {
  const sql = `SELECT name,tp_id,month_fee,id from tarif_plans `;

  return queryDatabaseBilling(sql)
}

async function getAdmin(login) {

  const sql = `SELECT id,DECODE(password,'test12345678901234567890') as pass from admins where id='${login}'`;
  return queryDatabaseBilling(sql)
}

async function getIdTelegram(num){
  const sql = `SELECT user_chat_id	 FROM client_chats_id where phone_number=${num} and state_notification='1' `;
  return queryDatabaseBilling(sql)
}

async function queryDatabase(sql){
  return new Promise((resolve, reject) => {
    connection.query(sql, function(err, results) {
      if (err) {
        reject(err);
      } else {
        const filteredArray = results.filter(item => item.value !== '' && item.value.length > 8);

const result = filteredArray.length > 0
  ? filteredArray[0]
  : { value: '', priority: '' };   
           resolve(result);
      }
    });
  });
}
async function getContactsForUidLogin(uidLoginArray) {
  const uidLoginWithContacts = [];
  for (const uidLogin of uidLoginArray) {
    const contactsQuery = `SELECT value, priority FROM users_contacts WHERE uid=${uidLogin.uid} AND value != ''
AND value NOT LIKE '037%'
AND value NOT LIKE '038%'
AND value NOT LIKE '035%'
AND value REGEXP '^[0-9]+$'
ORDER BY priority ASC
LIMIT 1;`;
let contactResult= await queryDatabaseBilling(contactsQuery)

  const filteredArray = contactResult.filter(item => item.value !== '' && item.value.length > 8);

const contactsResults = filteredArray.length > 0
? filteredArray[0]
: { value: '', priority: '' };   
     


    
    uidLoginWithContacts.push({
      ...uidLogin,
      contacts: {...contactsResults}
    });
  }

  return uidLoginWithContacts;
}
app.post("/login",async (req,res)=>{
  
  let login= req.body

  try {
    const sql = `SELECT id,DECODE(password,'test12345678901234567890') as pass from admins where id='${login.login}'`;

    const admin=await queryDatabaseBilling(sql)
   


    if(admin.length==0){
      res.json({flag:false})
      return
    }
    const pass= new TextDecoder('utf-8').decode(admin[0].pass)
    if(login.password==pass){
      
    res.json({flag:true})
    }else{
     
      // console.log(pass);
      // console.log(login.pass);

      res.json({flag:false})
    }
  } catch (error) {
    console.log(error);
    res.json(error)
  }

})
app.post('/getById', async (req, res) => {
  const id = req.body.id;
  let contacts
  console.log(id);
  try {
    const uidLogin= await getListUidNameBuyTariffId(id)
    let isTariff=uidLogin.length==0?false:true
     contacts=await getContactsForUidLogin(uidLogin)
    contacts=contacts.filter(e=>e.contacts.value!='')

    } 
    catch (e){
      console.log(e)
    }
     console.log(contacts);
    res.json(contacts);

});
app.post('/getByGroup', async (req, res) => {
  const group = req.body.group;
  let contacts
  console.log(group);
  try {
    const uidLogin= await getListUidNameBuyGroupId(group)
    let isTariff=uidLogin.length==0?false:true
     contacts=await getContactsForUidLogin(uidLogin)
    contacts=contacts.filter(e=>e.contacts.value!='')
   
    } 
    catch (e){
      console.log(e)
    }
     console.log(contacts);
    res.json(contacts);

});
//getListOfTariff
app.get('/getTariff',async(req,res)=>{
  let tariff=[]
  try {
    tariff=await getListTariff()
  }
  catch (e){
    console.log(e)
  }

  res.json(tariff)

})
mongoose.connect('mongodb://localhost:27017/mydatabase', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {


  console.log('Connected to MongoDB');



//getAllHistory

app.post("/getHistoryByDates",async(req,res)=>{
console.log("History");
  const body=req.body
    console.log(body.startDate);
  const startDate=  new Date(body.startDate)
  const endDate= new Date(body.endDate)
  console.log(startDate);
  console.log(endDate);

  try {
    const arrDate= await SMSHistory.find({datetime:{
      $gte: startDate,
      $lt: endDate
    }
    })
    console.log(arrDate.length);
   res.json(arrDate)

 
    
  } catch (error) {
    console.log(error);
    res.json([])
  }

})
app.post("/getDateForChart",async(req,res)=>{
  function formatDate(inputDate) {
    const date = new Date(inputDate);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  }
  const body=req.body
  const startDate=  new Date(body.startDate)
  const endDate= new Date(body.endDate)
  console.log(startDate);
  console.log(endDate);
  try {
    const records= await SMSHistory.find({datetime:{
      $gte: startDate,
      $lt: endDate
    }
    })
    const groupedData = {};
    records.forEach(record => {
      const dateKey  = formatDate(record.datetime)
     
      if (!groupedData[dateKey]) {
        groupedData[dateKey] = {
          datetime: dateKey,
          sms: 0,
          telegram: 0,
        };
      }

      if (record.type_send === 'sms') {
        
        groupedData[dateKey].sms++;
      } else if (record.type_send === 'bot') {
        groupedData[dateKey].telegram++;
      }
    });
    const resultArray = Object.values(groupedData);
   
    res.json(resultArray)
  } catch (error) {
    console.log(error);
    res.json([])
  }
})
//getBy admin
app.post("/getHistoryByAdmin",async(req,res)=>{
  console.log("Admin");
    const body=req.body
    const startDate= new Date(body.startDate)
    const endDate= new Date(body.endDate)
    const admin=body.admin
    console.log(startDate);
    console.log(endDate);
  
    try {
      const arrDate= await SMSHistory.find({datetime:{
        $gte: startDate,
        $lt: endDate
      },sender_sms:admin
      })
      console.log(arrDate.length);
     res.json(arrDate)
  
   
      
    } catch (error) {
      console.log(error);
      res.json([])
    }
  
  })
  //getHistoryByAbon
  app.post("/getHistoryByAbon",async(req,res)=>{
    console.log("Abon");
      const body=req.body

      const abonName=body.abonName
      const abonNumber=body.abonNumber

    
      try {
        const arrDate= await SMSHistory.find({
          $or: [
            { login: abonName },
            { phone_number: abonNumber }
        ]
        })
        console.log(arrDate.length);
       res.json(arrDate)
    
     
        
      } catch (error) {
        console.log(error);
        res.json([])
      }
    
    }) 
    app.post("/getHistoryByTelegram",async(req,res)=>{
      console.log("Telegram");
        const body=req.body
        const startDate=  (new Date(body.startDate))
        const endDate= (new Date(body.endDate))
        console.log(startDate);
        console.log(endDate);
      
        try {
          const arrDate= await SMSHistory.find({datetime:{
            $gte: startDate,
            $lt: endDate
          },type_send:"bot"
          })
          console.log(arrDate.length);
         res.json(arrDate)
      
       
          
        } catch (error) {
          console.log(error);
          res.json([])
        }
      
      })

      app.post("/getHistoryByTurbo",async(req,res)=>{
        console.log("SMS");
          const body=req.body
          const startDate=  new Date(body.startDate)
          const endDate= new Date(body.endDate)
          console.log(startDate);
          console.log(endDate);
        
          try {
            const arrDate= await SMSHistory.find({datetime:{
              $gte: startDate,
              $lt: endDate
            },type_send:"sms"
            })
            console.log(arrDate.length);
           res.json(arrDate)
        
         
            
          } catch (error) {
            console.log(error);
            res.json([])
          }
        
        })

  app.get("/sms-list", async (req,res)=>{
    let arr=0
    try {
      arr= await SMS.countDocuments()
      console.log("Довжина "+arr);
      res.json(arr)
    } catch (error) {
      console.log(error);
    }
   
  })


  app.get("/pending_sms",async (req,res)=>{
    let pendingSMS =[]
   try {
     pendingSMS = await SMS.find({ status: 'pending' }).exec();
     console.log("pendingSMS");

    
    res.json(pendingSMS);
  } catch (error) {
    console.error(error);
    
  }
  })

  app.get("/history",async (req,res)=>{
    let historySMS =[]
   try {
    historySMS = await SMSHistory.find()
     console.log(historySMS);

  
    res.json(historySMS);
  } catch (error) {
    console.error(error);
    
  }
  })
  app.post("/sms_element",async (req,res)=>{
    let i=req.body.id
   try {
  const resd=  await  SMS.findByIdAndRemove("64d62b41021d04ac13ac9dd3")
     console.log(resd);
 
  
    res.json(resd);
  } catch (error) {
    console.error(error);
    
  }
  })


  app.get("/delete_sms",async (req,res)=>{
    try {
      await SMS.deleteMany();
      res.json("Все окей видалено")
    } catch (error) {
      res.json("Все погано не  видалено")
    }
  
  })
  app.get("/delete_sms_history",async (req,res)=>{
    try {
      await SMSHistory.deleteMany();
      res.json("Все окей видалено")
    } catch (error) {
      res.json("Все погано не  видалено")
    }
  
  })
  app.get("/checkSMS",async (req,res)=>{

    const pendingSMS = await SMS.find({ status: 'pending' }, { id: 1, status: 1 }).exec();

    res.json(pendingSMS)

  })
  app.post('/save-sms', async (req, res) => {
    
    
    const currentDateTime = new Date();
    const smsArray =  req.body;
    console.log(smsArray);

    // Розпакування стиснутих даних
    zlib.inflate(smsArray, async(error, decompressedData) => {
      if (error) {
        console.error('Помилка при розпакуванні даних:', error);
        res.status(500).send('Помилка при розпакуванні даних.');
        return;
      }
  
      const listOfSMS = JSON.parse(decompressedData.toString());
  
     
    let arrSms=[]
    console.log(listOfSMS);
    try {
      for (const sms of listOfSMS) {
        let idTelegram
        if(sms.type=="bot"){
         
          const tel_number= sms.tel.substring(3)
          try {
              idTelegram=  await getIdTelegram(tel_number)
          } catch (error) {
            console.log(error);
            
          }
            if(idTelegram.length!=0){
              const smsWrite={
                type_send:"bot",
                phone_number:sms.tel,
                text_message:sms.sms,
                login:sms.id,
                datetime: currentDateTime,
                chat_id:idTelegram[0].user_chat_id,               
                status:"pending",
                sender_sms:sms.sender_sms
              }
              arrSms.push(smsWrite)
              continue
            }
            // else  {
            //   const smsWrite={
            //     type_send:"sms",
            //     phone_number:sms.tel,
            //     text_message:sms.sms,
            //     login:sms.id,
            //     datetime: currentDateTime,
            //     chat_id:"",
            //     status:"pending",
            //     sender_sms:sms.sender_sms
            //   }
            //   arrSms.push(smsWrite)
            //   continue

            // }

         }else  if(sms.type=="sms"){
          const smsWrite={
            type_send:"sms",
            phone_number:sms.tel,
            text_message:sms.sms,
            login:sms.id,
            datetime: currentDateTime,
            chat_id:"",
            status:"pending",
            sender_sms:sms.sender_sms
          }
          arrSms.push(smsWrite)
          } else{
            const tel_number= sms.tel.substring(3)
            try {
                idTelegram=  await getIdTelegram(tel_number)
            } catch (error) {
              console.log(error);
              
            }
              if(idTelegram.length!=0){
                const smsWrite={
                  type_send:"bot",
                  phone_number:sms.tel,
                  text_message:sms.sms,
                  login:sms.id,
                  datetime: currentDateTime,
                  chat_id:idTelegram[0].user_chat_id,               
                  status:"pending",
                  sender_sms:sms.sender_sms
                }
                arrSms.push(smsWrite)
                continue
              }
              else  {
                const smsWrite={
                  type_send:"sms",
                  phone_number:sms.tel,
                  text_message:sms.sms,
                  login:sms.id,
                  datetime: currentDateTime,
                  chat_id:"",
                  status:"pending",
                  sender_sms:sms.sender_sms
                }
                arrSms.push(smsWrite)
                continue
  
              }
          }
          


      }
      console.log(arrSms);
    await  SMS.insertMany(arrSms)
      res.status(200).json({ message: 'SMS data saved successfully' });
      
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Failed to save SMS data' });
    }
    finally{

    
    sendSmsToUser()
  
  }
  });

  
    });


    app.get("/sendSms-api-to-user-again",async(req,res)=>{
      try {
        console.log("aa");
        sendSmsToUser()
        res.json(true)
      } catch (error) {
        res.json(false)
      }
    })

    app.get('/messages', async (req, res) => {
      const page = parseInt(req.query.page) || 1;
      const perPage = 5;
      
      try {
        const totalMessages = await SMS.countDocuments({});
        
        const messages = await SMS.find({})
          .skip((page - 1) * perPage)
          .limit(perPage)
          .exec();
    
        return res.status(200).json({ messages, totalMessages });
      } catch (error) {
        return res.status(500).json({ error: 'An error occurred while fetching messages.' });
      }
    });
    app.get("/totalSMS",async (req,res)=>{
      const totalMessages = await SMS.countDocuments({});
      res.json({total:totalMessages})
    })
    
    app.get("/sendSMS",(req,res)=>{

      const phone = '380951470082';  
      const message = 'test'; 
      sendMessage("test",phone)


    })
    app.get('/download', async (req, res) => {

      const workbook = new excel.Workbook();
      const worksheet = workbook.addWorksheet('Messages');
      const messages=await SMSHistory.find();
      worksheet.addRow(['Login', 'Phone Number','Text Message','Date','chat_id','sender_sms','type_send']).font= { bold: true };

      messages.forEach(message => {
        worksheet.addRow([message.login, message.phone_number,message.text_message,message.datetime,message.chat_id,message.sender_sms,message.type_send]);
      });
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=messages.xlsx');
      worksheet.columns.forEach(column => {
        let maxLength = 0;
        column.eachCell({ includeEmpty: true }, cell => {
          const columnLength = cell.value ? cell.value.toString().length : 10;
          if (columnLength > maxLength) {
            maxLength = columnLength;
          }
        });
        column.width = maxLength < 10 ? 10 : maxLength;
      });
      workbook.xlsx.write(res)
        .then(() => {
          res.end();
        })
        .catch(error => {
          console.error('Error generating Excel:', error);
          res.status(500).send('Internal Server Error');
        });
    });

  
})
.catch(err => {
  console.error('Error connecting to MongoDB:', err);
});
async function getMacAbon(uid) {
  const sql = `SELECT * FROM internet_main  where uid='${uid}' `;

  return queryDatabaseBilling(sql)
}
app.get("/oltNumbers", async (req, res) => {
  try {
    const ip = req.query.ip;
    const sfp = req.query.sfp;
    const login = req.query.login;
    const last_date = req.query.last_date || "";

    console.log(req.query);

    let mac = "";

    if (login) {
      console.log("HERE");

      const api_key = 'BeheOmEkPob8';
      const url = 'https://us.intelekt.cv.ua/api.php';

      const GET4 = {
        params: {
          key: api_key,
          cat: 'customer',
          action: 'get_abon_id',
          data_typer: 'login',
          data_value: login,
        },
      };

      const response = await axios.get(url, GET4);
      const data_user = response.data.Id;

      const GET5 = {
        params: {
          key: api_key,
          cat: 'customer',
          action: 'get_data',
          customer_id: data_user,
        },
      };

      const response1 = await axios.get(url, GET5);
      const data_user_mac_uid = response1.data.data.billing.uuid;

      console.log(data_user_mac_uid, "data_user_mac_uid");

      let bilUser = await getMacAbon(data_user_mac_uid);
      mac = bilUser[0].cid.replace(/:/g, '').toUpperCase();
    }

    console.log(ip + " " + sfp + " " + last_date);

    const id_device = await getDeviceId(ip);
    
    if (id_device == 0) {
      return res.json([]);
    }

    const macList = await loginMac(id_device, sfp, mac, last_date);

    if (macList.length == 0) {
      return res.json([]);
    }

    console.log(macList);

    const macString = macList.map(mac => `'${mac}'`).join(", ");

    const contactsQuery = `SELECT u.id, i.uid
      FROM users u 
      JOIN internet_main i ON u.uid = i.uid
      WHERE i.cid in (${macString}) and (gid!='24' and gid!='25');`;

    let idUidArr = await getListUidNameBuyMAC(contactsQuery);
    let contacts = await getContactsForUidLogin(idUidArr);
    contacts = contacts.filter(e => e.contacts.value !== '');

    res.json(contacts);
  } catch (error) {
    console.error(error, "ERROR");
    res.json([]);
  }
});
app.get("/oltNumbersAll", async (req, res) => {
  try {
    const ip = req.query.ip;
    const login = req.query.login;
    const last_date = req.query.last_date || "";
    console.log(login);

    let mac = "";

    if (login) {
      console.log("TUT");

      const api_key = 'BeheOmEkPob8';
      const url = 'https://us.intelekt.cv.ua/api.php';

      const GET4 = {
        params: {
          key: api_key,
          cat: 'customer',
          action: 'get_abon_id',
          data_typer: 'login',
          data_value: login,
        }
      };

      const response = await axios.get(url, GET4);
      const data_user = response.data.Id;

      const GET5 = {
        params: {
          key: api_key,
          cat: 'customer',
          action: 'get_data',
          customer_id: data_user
        }
      };

      const response1 = await axios.get(url, GET5);
      const data_user_mac_uid = response1.data.data.billing.uuid;

      let bilUser = await getMacAbon(data_user_mac_uid);
      mac = bilUser[0].cid.replace(/:/g, '').toUpperCase();
    }

    console.log(ip + " " + " " + last_date);

    const id_device = await getDeviceId(ip);

    if (id_device == 0) {
      return res.json([]);
    }

    const macList = await loginMacAll(id_device, mac, last_date);

    if (macList.length == 0) {
      return res.json([]);
    }

    console.log(macList);

    const macString = macList.map(mac => `'${mac}'`).join(", ");

    const contactsQuery = `SELECT u.id, i.uid
      FROM users u 
      JOIN internet_main i ON u.uid = i.uid
      WHERE i.cid in (${macString}) and (gid!='24' and gid!='25');`;

    let idUidArr = await getListUidNameBuyMAC(contactsQuery);
    let contacts = await getContactsForUidLogin(idUidArr);
    contacts = contacts.filter(e => e.contacts.value !== '');

    res.json(contacts);
  } catch (error) {
    console.error(error, "ERROR");
    res.json([]);
  }
});

  app.get("/switchNumbers", async (req, res) => {
    try {
      const ip = req.query.ip;
      console.log(ip);
      const id_device = await getDeviceId(ip);
  
      if (id_device == 0) {
        res.json([]);
        return; // Ensure you return after sending the response
      }
  
      const macList = await loginMacSwitch(id_device);
      const macString = macList.map((mac) => `'${mac}'`).join(", ");
      const contactsQuery = `SELECT u.id, i.uid
        FROM users u 
        JOIN internet_main i ON u.uid = i.uid
        WHERE i.cid in (${macString}) and (gid!='24' and gid!='25');`;
  
      let idUidArr = await getListUidNameBuyMAC(contactsQuery);
      let contacts = await getContactsForUidLogin(idUidArr);
  
      console.log(contacts);
      contacts = contacts.filter((e) => e.contacts.value != '');
  
      let responseSent = false; // Flag to track if response has been sent
  
      if (contacts.length != 0 && !responseSent) {
        res.json(contacts);
        responseSent = true; // Set the flag after sending the response
      } else if (!responseSent) {
        res.json([]);
        responseSent = true;
      }
    } catch (error) {
      if (!res.headersSent) {
        // Check if headers have been sent before attempting to send an error response
        res.json([]);
      }
    }
  });
  function splitStringByFirstSpace(inputString) {
    const firstSpaceIndex = inputString.indexOf(' ');
  
    if (firstSpaceIndex === -1) {
      // Якщо пробіл не знайдено, повертаємо початковий рядок як перший елемент масиву
      return [inputString];
    } else {
      const part1 = inputString.substring(0, firstSpaceIndex);
      const part2 = inputString.substring(firstSpaceIndex + 1);
      return [part1, part2];
    }
  }
  function removeSpaces(inputString) {
    const stringWithoutSpaces = inputString.replace(/\s+/g, '');
    return stringWithoutSpaces;
  }

  async function getUIDIDCity(city,street,buildId) {
    const sql = `
    SELECT u.id, u.uid
FROM users u
JOIN users_pi up ON u.uid = up.uid
JOIN builds b ON up.location_id = b.id
JOIN streets s ON b.street_id = s.id
JOIN districts d ON s.district_id = d.id
WHERE d.name  ='${city}'
${street!=''?'AND '+'s.name =' +'\''+street+'\'':''}
${buildId!=""?'AND'+ '(b.number ='+''+'\''+buildId+'\''+')'+'':''}

    `

     return queryDatabaseBilling(sql)
  }

  app.get("/addressNumbers",async (req,res)=>{
    try {
      
      let budId ='' 
   const address =splitStringByFirstSpace(req.query.address.trim());
   if(!req.query.budId){
    budId=''
   
   }
   let uidArr=[]
   budId=removeSpaces (req.query.budId.trim());
   console.log((address)); 
   console.log((budId));
   if(!address[1]){
     uidArr=await getUIDIDCity(address[0],'','')
   }else{
    uidArr=await getUIDIDCity(address[0],address[1],budId)}
   let contacts=await getContactsForUidLogin(uidArr)
   console.log(contacts);
   contacts=contacts.filter(e=>e.contacts.value!='')
   res.json(contacts)
  } catch (error) {
    log(error)
      res.json([])
  }

  })

  async function queryDatabase1(sql){
    return new Promise((resolve, reject) => {
      connection.query(sql, function(err, results) {
        if (err) {
          reject(err);
        } else 
        { 
             resolve(results);
        }
      });
    });
  }
  app.get("/infoByUser", async (req, res) => {
    try {
      let numbers = req.query.numbers.split(',');
      console.log(numbers.length);
  
      let result = await Promise.all(numbers.map(async (e) => {
        let res = {};
        let sql = `SELECT uid
        FROM users_contacts
        WHERE value ='${e}'
       
AND value NOT LIKE '037%'
AND value NOT LIKE '038%'
AND value NOT LIKE '035%'
AND value REGEXP '^[0-9]+$'
ORDER BY priority ASC
LIMIT 1;;
        `;
        let sql1 = '';
        try {
          let query = await queryDatabaseBilling(sql);
          if (query.length == 0) {
            res = {
              id: 'no_login',
              tel: e,
            };
          } else {
            sql1 = `SELECT id,uid FROM users where uid='${query[0].uid}' `;
            let query1 = await queryDatabaseBilling(sql1);
            if (query1.length == 0) {
              res = {
                id: 'no_login',
                tel: e,
              };
            } else {
              res = {
                id: query1[0].id,
                tel: e,
                uid:query1[0].uid,
              };
            }
          }
          
          return res;
        } catch (error) {
          throw error;
        }
      }));
  
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'An error occurred' });
    }
  });

  app.get("/infoByUserLogins", async (req, res) => {
    try {
      let logins = req.query.logins.split(',');
      console.log(logins.length);
  
      let result = await Promise.all(logins.map(async (e) => {
        let res = {};
     
        let sqlnumber=`SELECT value, uid
        FROM users_contacts
        WHERE uid = (
          SELECT uid
          FROM users
          WHERE id = '${e}'
        )
        AND value != ''
        AND value NOT LIKE '037%'
        AND value NOT LIKE '038%'
        AND value NOT LIKE '035%'
        AND value REGEXP '^[0-9]+$'
        ORDER BY priority ASC
        LIMIT 1;
      `
  const userNumber=await queryDatabaseBilling(sqlnumber)

  return res = {
    id: e,
    tel: userNumber[0].value,
    uid:userNumber[0].uid,
  };

      }));
  
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'An error occurred' });
    }
  });

  app.get("/balance",async (req,res)=>{
    let uid = req.query.uid
    try {
    let sql=`SELECT deposit FROM bills where uid='${uid}}'`
  
  let data =await queryDatabaseBilling(sql)
  res.json(data[0].deposit) 
} catch (error) {
      
    }
  })
  app.get("/tariff",async (req,res)=>{
    let uid = req.query.uid
    try {
  
  let sql=`SELECT name
  FROM tarif_plans
  WHERE tp_id = (
      SELECT tp_id
      FROM internet_main
      WHERE uid = '${uid}'
  );`

  let data =await queryDatabaseBilling(sql)
  res.json(data[0].name) 
} catch (error) {
  res.json('немає тарифного плану абонент') 
    }
  })
 async function getBalance(uid) {
    try {
    let sql=`SELECT deposit FROM bills where uid='${uid}'`
  
  let data =await queryDatabaseBilling(sql)
 return (data[0].deposit) 
} catch (error) {
      
    }
  }
 async function getTariff(uid) {
  try {
  
    let sql=`SELECT name
    FROM tarif_plans
    WHERE tp_id = (
        SELECT tp_id
        FROM internet_main
        WHERE uid = '${uid}'
    );`
  
    let data =await queryDatabaseBilling(sql)
    return(data[0].name) 
  } catch (error) {
    return('немає тарифного плану абонент') 
      }
  }
  app.post("/tariff-balans", async (req, res) => {
    try {
      function replaceLogText(inputText, log) {
        let  sms=inputText
         if (sms.includes('[log]')) {
          return  sms.replace(/\[log\]/g, log);
         } 
         return sms;
     }
     function replaceBalText(inputText, bal) {
       let  sms=inputText
        if (sms.includes('[bal]')) {
         return  sms.replace(/\[bal\]/g, bal);
        } 
        return sms;
    }
     function replaceTarText(inputText, tar) {
       let  sms=inputText
       if (sms.includes('[tar]')) {
         if(tar=='немає тарифного плану абонент'){
           return  sms.replace(/\[tar\]/g, '');
         }
        return  sms.replace(/\[tar\]/g, tar);
       } 
       return sms;
   }   
      const { listOfUser, shablon, value, user } = req.body; // Отримуємо дані з фронтенду
  
      const smsList = await Promise.all(
        listOfUser.map(async (e) => {
          const resptar = await getTariff(e.uid)
          const respbal = await getBalance(e.uid)
          
          let sms = replaceLogText(shablon, e.id);
          sms = replaceTarText(sms, resptar);
          sms = replaceBalText(sms, respbal);

          return {
            id: e.id,
            tel: e.contacts.value,
            sms: sms,
            type: value,
            sender_sms: user,
          };
        })
      );
  
      res.json(smsList); // Повертаємо масив даних на фронтенд
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Помилка обробки запиту" });
    }
  });

 app.get("/addShablon",async(req,res)=>{
  try {
    
  let shablon=req.query.shablon
  let creator=req.query.creator
 const shablons = new Shablon({
    text:shablon,
    creator:creator
  });

 let data= await shablons.save()
res.json(true)}
 catch (error) {
  res.json(false)
  }
 }) 

 app.get("/getShablons",async(req,res)=>{

  try {
    let data=await Shablon.find()
    res.json(data)
  } catch (error) {
    
  }



 })
 app.get("/deleteShablon",async(req,res)=>{
  let text=req.query.text
  let creator=req.query.creator

  try {
    let data=await Shablon.findOneAndDelete({
      text:text,
      creator:creator
    })
    res.json(true)
  } catch (error) {
    res.json(false)
  }



 })
 app.get("/deleteShablonById",async(req,res)=>{
  let id=req.query.id


  try {
    let data=await Shablon.findByIdAndDelete(id)
    res.json(true)
  } catch (error) {
    res.json(false)
  }



 })
 app.get("/getShabCreator",async(req,res)=>{
  let creator=req.query.creator
  try {
    let data=await Shablon.find({creator:creator})
    res.json(data)
  } catch (error) {
    
  }



 })

 
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
