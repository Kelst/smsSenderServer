mongoose.connect('mongodb://localhost:27017/mydatabase', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {

  io.on("connection", (socket) => {
    console.log("We are live and connected");
   socket.on('getPendingSMS', async () => {
      try {
        setInterval(async () => {
           const   pendingSMS = await SMS.find({ status: 'pending' }).exec();
          socket.emit('pendingSMS', pendingSMS);
          }, 2000);
        
      } catch (error) {
        console.error(error);setInterval(() => {
    socket.emit('data', { message: 'Hello from the server' });
  }, 5000);
      }
    });  
  });
  
  httpServer.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
  });
  
  
})
.catch(err => {
  console.error('Error connecting to MongoDB:', err);
});
