var express = require("express");
var bodyParser = require("body-parser");
var app = express();
var mysql = require('mysql');
var crypto = require('crypto')
var cookieParser = require('cookie-parser');
const { shouldSendSameSiteNone } = require('should-send-same-site-none');
app.use(shouldSendSameSiteNone);

app.use(express.static("public"))
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.set("view engine","ejs");
app.use(cookieParser());


var db = mysql.createConnection({
  host: "hospital-db.cso3ypvtwtdo.ap-south-1.rds.amazonaws.com",
  port: "3306",
  user: "admin",
  password: "admin1234",
  database: "hospital"
});





app.get("/",function(req,res){

    res.render("index");

})

app.post("/",function(req,res){

    var data = req.body;
    var patientID = data.patient_ID;
    var pass=data.password
    var hash = crypto.createHash('md5').update(pass).digest('hex');
    sqlquery = "Select * from patient where patient_id='" + patientID + "' and password = '"+hash + "';";
    db.query(sqlquery,function(err,results){
        if(results=='')
            res.send("Invalid Username or password");
        else{
            var patientID = results[0].patient_id;
            res.cookie("ID",patientID);
            res.send("<script>window.location.replace('dash')</script>");
        }
    })

})



app.get("/dash",function(req,res){
    var pid = req.cookies.ID;
    sqlquery = "Select * from patient where patient_id='" + pid+"';";
    db.query(sqlquery,function(err,results){
         var patient_id = results[0].patient_id;
         var patient_name = results[0].patient_name;
         var dob = results[0].dob;
         var phone_number = results[0].phone_number;
         var address = results[0].address;
         var pt_data={
          patient_id: patient_id,
          patient_name: patient_name,
          dob: dob,
          phone_number: phone_number,
          address: address
       } 
       console.log(pt_data)
         db.query("SELECT * FROM PatientHis",function(err,resul)
         {

            returnedData={sqldata:resul, pt_data:pt_data}
            res.render("dash",returnedData)
         })

         
        
    })
}) 

app.post("/dash",function(req,res){

    res.clearCookie("ID");
    res.redirect("/");
    res.end();
})

app.get("/signup",function(req,res){
    res.render("signup");
})

app.post("/signup",function(req,res){
    var data = req.body;
    var patient_name=(data.patient_name).toUpperCase();
    var dob=data.dob;
    var address=data.address;
    var number = data.number;
    var pass=data.password;
    var sqlquery = "Select * from patient where patient_name='"+patient_name+"'and dob='"+dob+"'and phone_number='"+number+"'";
    db.query(sqlquery,function(err,results){
        if(results!='')
            {
                console.log(results);
                res.send("Patient with the given data already exists");
            }
        else
        {
            var part1 = "P"+patient_name.slice(0,4)+"00";
            var part2 = part1+new Date().getFullYear();
            var part3 = part2+dob.toString()[8]+dob.toString()[9]
            db.query("Select count(*) as no_of_records from patient",function(err,reslt){
                var no_of_records = parseInt(reslt[0].no_of_records);
                no_of_records--;
                db.query("Select * from patient",function(err,resu){
                    var lastentryindex=parseInt(resu[no_of_records].patient_id.toString().slice(13,16));
                    lastentryindex++;
                    if(lastentryindex<9)
                        part4=part3+"00"+lastentryindex;
                    else if(lastentryindex>=9 && lastentryindex<99)
                        part4=part3+"0"+lastentryindex
                    else if(lastentryindex>=99 && lastentryindex<100)
                        part4=part3+lastentryindex
                    patient_id=part4;
                    var hash = crypto.createHash('md5').update(pass).digest('hex');
                    var q= "INSERT INTO patient(patient_id,patient_name,dob,phone_number,address,password) VALUES ('"+patient_id+"','"+patient_name+"','"+dob+"','"+number+"','"+address+"','"+hash+"')";   
                        db.query(q,function(err,resl){
                            if(err)
                                throw err;
                            else
                            {
                                res.send("Your account has been successfully created, this is your patient ID:"+patient_id+".<br> Keep it safe and head to  <a href='/'>Login Page</a>  to log into your dashboard")
                            }
                        });
                })
                
            })
        }
    })
})


app.get("/user-list",function(req,res){

    var sql='SELECT DoctorInfo.Doctor_ID,DoctorInfo.Doctor_Name,DoctorInfo.Field,DoctorInfo.DegreeInfo,Availslot.Timeslot,Availslot.Tot_No_Of_Appt,Availslot.Cur_No_of_Appt,Availslot.Day FROM DoctorInfo, Availslot WHERE DoctorInfo.Doctor_ID = Availslot.Doctor_ID;';
    db.query(sql, function (err, data, fields) {
    if (err) throw err;
    res.render('user-list', { title: 'User List', userData: data});
  });
  
});

app.post('/user-list/:Cur_num_appt/:Doctor_ID/:Timeslot/:Day', function (req, res) {
    console.log();
    var currnumappt = req.params.Cur_num_appt;
    var docid = req.params.Doctor_ID;
    var tim = req.params.Timeslot;
    var day = req.params.Day;
    var reason_for_ref = req.body.reason;
    //console.log(tim.substring(1,tim.length-1));
    var currnumappt1 = parseInt(currnumappt) + 1;
    var query = `
      UPDATE Availslot 
      SET Cur_No_of_Appt = "${currnumappt1}" 
    WHERE Doctor_ID LIKE "${docid}" 
    AND Timeslot LIKE "${tim}"
    AND Day LIKE "${day}"
      `;
    db.query(query, function(error, data){
  
          if(error)
          {
              throw error;
          }
          
      });
   
    var query1 = `
      DELETE FROM Appointment 
    WHERE Date_of_Appt < CURDATE()  
      `;
    db.query(query1, function(error, data){
  
          if(error)
          {
              throw error;
          }
          
      });
    var pid = req.cookies.ID;
  
    var query2 = `
        insert into Appointment (patient_id,Doctor_ID,Day,Date_Of_Appt,Timeslot,Reason) values("${pid}","${docid}","${day}",CURDATE(),"${tim}","${reason_for_ref}")`;
    db.query(query2, function(error, data){
  
          if(error)
          {
              throw error;
          }
          
      });
    var docname = `Select Doctor_Name from DoctorInfo where Doctor_ID LIKE "${docid}" `;
    db.query(docname, function(error, data){
  
          if(error)
          {
              throw error;
          }
          var doctorname = data[0].Doctor_Name;
      var query3 = `
    insert into PatientHis (patient_id,Doctor_ID,Date_Of_Appt,Timeslot,MedicalReason,Doctor_Name,Day) values("${pid}","${docid}",CURDATE(),"${tim}","${reason_for_ref}","${doctorname}","${day}")
  `;
  db.query(query3, function(error, data){
  
    if(error)
    {
      throw error;
    }
      
  });
  res.redirect('/user-list');     
      });
    
   
  }); 
  


  app.get("/cancel",function(req,res){
    var pid = req.cookies.ID;
    var sql = `Select Appointment.App_ID,Appointment.patient_id, Appointment.Doctor_ID,Appointment.Date_Of_Appt,Appointment.Timeslot,Appointment.Reason, Appointment.Day, DoctorInfo.Doctor_Name from Appointment,DoctorInfo where patient_id = "${pid}" and DoctorInfo.Doctor_ID = Appointment.Doctor_ID`;
    
    db.query(sql, function(error, data){
    
      if(error)
      {
        throw error;
      }
    //var date = new Date(data.Date_Of_Appt);
    //console.log(date.toLocaleDateString());
      res.render('cancel', { title: 'User List', userData: data});
    });
    
    });
    
    app.post("/cancel/:Appt_ID/:Doctor_ID/:Doctor_Name/:Date_Of_Appt/:Timeslot/:Reason/:Day",function(req,res){
      var pid = req.cookies.ID;
      var docid = req.params.Doctor_ID;
      var docname = req.params.Doctor_Name;
      var apptid = req.params.Appt_ID;
      var dateofappt = new Date(req.params.Date_Of_Appt);
      var day = req.params.Day;
      dateofappt=dateofappt.toLocaleDateString();
      dateofappt=dateofappt.split('/');
      var tmp=dateofappt[2];
      dateofappt[2]=dateofappt[0];
      dateofappt[0]=tmp;
    
      var timeslot = req.params.Timeslot;
      var reasonforref = req.params.Reason; 
     var sql = `Delete from Appointment where App_ID = "${apptid}" and patient_id LIKE "${pid}" and Doctor_ID LIKE "${docid}" and Date_of_Appt = "${dateofappt}" and Timeslot Like "${timeslot}" and Day LIKE "${day}"`;
      db.query(sql, function(error, data){
      
        if(error)
        {
          throw error;
        }
    
        var sql1 = `Select * from Availslot where Doctor_ID LIKE "${docid}" and Timeslot LIKE "${timeslot}" and Day LIKE "${day}"`;
        db.query(sql1, function(error, data){
          if(error)
          {
            throw error;
          }
          var currnumappt2 = data[0].Cur_No_of_Appt - 1;
          var query = `
        UPDATE Availslot 
        SET Cur_No_of_Appt = "${currnumappt2}" 
      WHERE Doctor_ID LIKE "${docid}" 
      AND Timeslot LIKE "${timeslot}"
      AND Day LIKE "${day}"`;
      db.query(query, function(error, data){
      
        if(error)
        {
          throw error;
        }
        db.query(`DELETE FROM PatientHis Where patient_id= "${pid}" AND Doctor_ID="${docid}" AND MedicalReason LIKE "${reasonforref} AND Day LIKE "${day}" AND Date_of_Appt = "${dateofappt}" AND Timeslot="${timeslot}"`,function(err,r){
          if(err)
            console.log(err);
          res.redirect('/cancel');
        })

      });
        });
        
      });
    });



var server = app.listen('8080',function(){
    var host = server.address();

}) 