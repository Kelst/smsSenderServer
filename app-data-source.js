const typeorm =require("typeorm")
 module.exports =  myDataSource = new typeorm.DataSource({
    type: "postgres",
    host: "194.8.147.150",
    port: 3003,
    username: "smsuser",
    password: "smsuser",
    database: "sms",
    entities: ["src/entity/*.js"],
    logging: true,
    synchronize: true,
    entities: [require("./entity/SMS")],
})

