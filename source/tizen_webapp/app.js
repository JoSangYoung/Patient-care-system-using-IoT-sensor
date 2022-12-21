// delab_patient1 디바이스 아이디, 토큰
const P1_DEVICE_ID = "f363c4e7183c4d78aeec21abc966a74c";
const P1_DEVICE_TOKEN = "59c21ffcc5184c5ba8d1397470284533";
const UID = "aefe5051a2f64edd853d4e1066d23378";
// delab_patient1 디바이스용 데이터, 액션 소켓
const P1_DATA_SOCKET_URL = "wss://api.artik.cloud/v1.1/live?sdids=" + P1_DEVICE_ID + "&uid=" + UID +"&Authorization=bearer+" + P1_DEVICE_TOKEN;
const P1_ACTION_SOCKET_URL = "wss://api.artik.cloud/v1.1/websocket?sdids=" + P1_DEVICE_ID + "&uid=" + UID + "&Authorization=bearer+" + P1_DEVICE_TOKEN;

// delab_patientRoom 디바이스 아이디, 토큰
const PR_DEVICE_ID = "58a51625ccd5468280f7ab12950aea81";
const PR_DEVICE_TOKEN = "6e261fc8dd4040008812c06493dd466d";
//delab_patientRoom 디바이스용 데이터, 액션 소켓
const PR_DATA_SOCKET_URL = "wss://api.artik.cloud/v1.1/live?sdids=" + PR_DEVICE_ID + "&uid=" + UID + "&Authorization=bearer+" + PR_DEVICE_TOKEN;
const PR_ACTION_SOCKET_URL = "wss://api.artik.cloud/v1.1/websocket?sdids=" + PR_DEVICE_ID + "&uid=" + UID + "&Authorization=bearer+" + PR_DEVICE_TOKEN;

var p1ActionSocket, p1DataSocket, p2ActionSocket, p2DataSocket, prActionSocket, prDataSocket;

// 내 app id
var myappId = tizen.application.getAppInfo().id;

// 노티피케이션
var appControl = new tizen.ApplicationControl('http://tizen.org/appcontrol/operation/create_content', null, 'image/jpg', null, null);
var notificationDict, notification;

function noti(msg, title){
	notificationDict = {
			content: msg,
			vibration: true,
			appId: myappId,
			appControl: appControl
	};

	notification = new tizen.StatusNotification('SIMPLE', title, notificationDict);
	tizen.notification.post(notification);
}

// p1 환자 센서 데이터 처리용 
function p1DataListener(){
   p1DataSocket = new WebSocket(P1_DATA_SOCKET_URL);

   p1DataSocket.onopen = function() {
        console.log('info)P1 Data socket Connected.');
    };
    
    p1DataSocket.onmessage = function(e) {        
        var parsed = JSON.parse(e.data);
        var jsonType = Object.keys(parsed)[0];

        // ping message면 그냥 무시
        if(parsed[jsonType] == 'ping')
       {
           console.log('info)Data ping came.');
           return;
       }
        else
        {
           if(Object.keys(parsed.data) == 'urineBag')
           {
               var data = document.getElementById("urineBagRemains");

        	   console.log("data)Received urineBag data is " + parsed.data.urineBag);
               data.innerHTML = urineBagBool(parsed.data.urineBag);
               colorer(data, urineBagBool(parsed.data.urineBag));
           }
           else if(Object.keys(parsed.data) == 'ringer')
           {
               var data = document.getElementById("ringerRemains");

        	   console.log("data)Received ringer data is " + parsed.data.ringer);
               data.innerHTML = ringerBool(parsed.data.ringer);
               colorer(data, ringerBool(parsed.data.ringer));
           }
        }    
    };

    p1DataSocket.onerror = function() {
        console.log('error)Socket is not connected.');
    };
}

// p1 환자 액션 처리용
function p1actionListener(){
   p1ActionSocket = new WebSocket(P1_ACTION_SOCKET_URL);

   p1ActionSocket.onopen = function() {
        console.log('info)P1 action socket Connected.');
        
        // delab_patient 액션 받을 채널 등록
        var registerAction = {
                "sdid": P1_DEVICE_ID,
                  "Authorization": "bearer " + P1_DEVICE_TOKEN,
                  "type": "register",
                  "cid": "b41df4be89284ef48c0d853220c169d9"
                };
        
       p1ActionSocket.send(JSON.stringify(registerAction));
    };
    
    p1ActionSocket.onmessage = function(e) {
        var parsed = JSON.parse(e.data);
        var jsonType = Object.keys(parsed)[0];
         
        // ping message면 그냥 무시
        if(parsed[jsonType] == 'ping')
        {
           console.log('info)Action ping came.');
           return;
        }
        
        
      switch(parsed.data.actions.pop().name)
      {
         case 'ringerAction':
     		console.log("info)Patient ringer noti.");

     		noti('링거 교체가 필요합니다.', '환자 상태 알림');

    		break;
         case 'urineBagAction':
      		console.log("info)Patient urineBag noti.");

     		noti('유린백을 비워주세요.', '환자 상태 알림');

    		break;
         default:
            break;
      }
        
    };

    p1ActionSocket.onerror = function() {
        console.log('error)Socket is not connected.');
    };
}


// patientRoom 센서 데이터 처리용 
function prDataListener(){
   prDataSocket = new WebSocket(PR_DATA_SOCKET_URL);

   prDataSocket.onopen = function() {
        console.log('info)Pr data Socket Connected.');
    };
    
    prDataSocket.onmessage = function(e) {        
        var parsed = JSON.parse(e.data);
        var jsonType = Object.keys(parsed)[0];

        // ping message면 그냥 무시
        if(parsed[jsonType] == 'ping')
       {
           console.log('info)Data ping came.');
           return;
       }
        else
        {
           if(Object.keys(parsed.data) == 'toxicGas')
           {
              console.log("data)Received toxicGas data is " + parsed.data.toxicGas);
              document.getElementById("toxicGasState").innerHTML = parsed.data.toxicGas;
               
         	  document.getElementById("toxicGasState").style.color = "#54BD54";

           }
           else if(Object.keys(parsed.data) == 'wasteBasket')
           {        	   
              console.log("data)Received wasteBasket data is " + parsed.data.wasteBasket);
              document.getElementById("wasteBasketRemains").innerHTML = wastePercentage(parsed.data.wasteBasket)+'%';
              
              if(parsed.data.wasteBasket > 2000)
            	  document.getElementById("wasteBasketRemains").style.color = "#E16A93";
              else
            	  document.getElementById("wasteBasketRemains").style.color = "#54BD54";
           }
           else if(Object.keys(parsed.data) == 'humidity,temperature')
           {        	   
              console.log("data)Received temperature data is " + parsed.data.temperature);
              document.getElementById("temperature").innerHTML = parsed.data.temperature+'C';
              
              console.log("data)Received humidity data is " + parsed.data.humidity);
              document.getElementById("humidity").innerHTML = parsed.data.humidity+'%';
           }
        }    
    };

    p1DataSocket.onerror = function() {
        console.log('error)Socket is not connected.');
    };
}

// patientRoom 액션 처리용
function prActionListener(){
   prActionSocket = new WebSocket(PR_ACTION_SOCKET_URL);

   prActionSocket.onopen = function() {
        console.log('info)Pr action socket Connected.');
        
        // delab_patient 액션 받을 채널 등록
        var registerAction = {
                "sdid": PR_DEVICE_ID,
                  "Authorization": "bearer " + PR_DEVICE_TOKEN,
                  "type": "register",
                  "cid": "b41df4be89284ef48c0d853220c169d9"
                };
        
       prActionSocket.send(JSON.stringify(registerAction));
    };
    
    prActionSocket.onmessage = function(e) {
        var parsed = JSON.parse(e.data);
        var jsonType = Object.keys(parsed)[0];
        
        console.log("info)Patient room action came.");
        
        // ping message면 그냥 무시
        if(parsed[jsonType] == 'ping')
        {
           console.log('info)Patient room action ping came.');
           return;
        }
        
        switch(parsed.data.actions.pop().name)
        {
        	case 'wasteBasketAction':
        		console.log("info)Patient room wasteBasket noti.");
               
         		noti('쓰레기통을 비워주세요.', '병실 상태 알림');
         
	            break;
        	case 'toxicGasAction':
        		console.log("info)Patient room toxicGas noti.");

         		noti('유해가스가 검출되었습니다.', '병실 상태 알림');
  
        		break;
         case 'emergencyCallAction':
        	 console.log("info)Patient room emergencyCallAction noti.");
             
        	 notificationDict = {
        			 content: '긴급호출!',
        			 vibration: true,
        			 appId: myappId,
        			 appControl: appControl
        	 };
          
        	 notification = new tizen.StatusNotification('SIMPLE', '긴급 호출', notificationDict);
        	 tizen.notification.post(notification);
          
        	 break;
         default:
            break;
      }

    };

    p1ActionSocket.onerror = function() {
        console.log('error)Socket is not connected.');
    };
}

function wastePercentage(waste){
	var ret = Math.round((waste-1150)/16);
	
	if(ret < 0)
		return 0;
	
	return ret;
}

function ringerBool(ringer){
	// 링거액이 있을 때
	if(ringer < 100)
		return '적절';
	else
		return '교체 필요';
}

function urineBagBool(urineBag){
	// 추후에 퍼센티지로 바꿀수도 있음
	if(urineBag > 900)
		return '교체 필요';
	else
		return '적절';
}

function colorer(htmlObj, color){
	if(color == '적절')
		htmlObj.style.color = "#54BD54";
	else if(color == '교체 필요')
		htmlObj.style.color = "#E16A93";
}

( function () {
	window.addEventListener( 'tizenhwkey', function( ev ) {
		if( ev.keyName === "back" ) {
			/*			var page = document.getElementsByClassName( 'ui-page-active' )[0],
				pageid = page ? page.id : "";
			console.log("page : " + page + "page id : " + pageid);
			if( pageid === "main" ) {
				try {
					tizen.application.getCurrentApplication().exit();
				} catch (ignore) {
				}
			} else {
				window.history.back();
			}*/
			//console.log("back button pressed");
	        //tau.changePage(document.getElementById("main"));
			//tizen.application.getCurrentApplication().exit();
	        //tau.changePage(document.getElementById("selectPage"), { transition:"slide"});
	        //tau.changePage(document.getElementById("patientDetailPage"), { transition:"slide"});
			console.log('back button');
			//tau.changePage(document.getElementById("selectPage"));
			tau.back();
		}
	} );
	
    // 첫 페이지에서 병실 선택하면
    var patientRoom = document.querySelector('.patientRoom');
    patientRoom.addEventListener("click", function(){
        //document.location.href='#selectPage';
        tau.changePage(document.getElementById("selectPage"));
    });
    
    // 두번째 페이지에서 병실 선택하면
    var patientRoomDetail = document.querySelector('#patientRoomDetail');
    patientRoomDetail.addEventListener("click", function(){
        tau.changePage(document.getElementById("patientRoomDetailPage"));
    });
    
    // 두번째 페이지에서 환자 선택하면
    var patientDetail = document.querySelector('.patientDetail');
    patientDetail.addEventListener("click", function(){
        tau.changePage(document.getElementById("patientDetailPage"));
    });
        
    p1DataListener();
    p1actionListener();
    prDataListener();
    prActionListener();
	
} () );
