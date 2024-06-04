const { clearInterval } = require('timers');

// function scheduleParser(str) {
//   const dateRe = new RegExp("?<=[on]).*(?=[to|at|that]");
//   const timeRe = new RegExp("?<=[at]).*(?=[to|on|that]");
//   const eventRe = new RegExp("?<=[to|that]).*");
//   var date = str.match(dateRe);
//   var time = str.match(timeRe)
//   var event = str.match(eventRe)
//   var today = new Date();
  
//   if (!date && !time){
//     var seconds = 10 
//   }
//   else{
//     if (!date){
//       date = today.getMonth + ' ' + today.getDay
//     }
//     if (!time){
//       time = '12:00'
//     }
//     var endDate = new Date(date + ' ' + time)
//     var seconds = (endDate.getTime() - today.getTime()) / 1000;
//   }
//   if (!event){
//     event = "Here to remind you about something. Dunno what though... You never told me."
//   }
//   return seconds, event
// }


// const schedulerSchema = new Schema

// setInterval(async () => {
//   const schedulers = await scheduler.find();
//   if (!schedulers) return;
//   else{
//     schedulers.forEach( async scheduler => {
//       if (scheduler.Time > Date.now()) return;
//       message.channel.send(scheduler.Event)
//     }).catch((error) => console.error('Scheduler:\n', error));

//     await schedulerFunc.deleteMany({
//       Time: scheduler.Time,
//       Event: scheduler.Event 
//     });
//   }
// }, 5000);