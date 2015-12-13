function getTimestamp() {
  var milliseconds = new Date().getTime();
  return Math.floor(milliseconds / 1000);
}

function secondsToTime(secs) {
  var hours = Math.floor(secs / (60 * 60));
  
  var divisor_for_minutes = secs % (60 * 60);
  var minutes = Math.floor(divisor_for_minutes / 60);
  
  var divisor_for_seconds = divisor_for_minutes % 60;
  var seconds = Math.ceil(divisor_for_seconds);
  
  var obj = {
    "h": hours,
    "m": minutes,
    "s": seconds
  };
  return obj;
}

function timeString(timeDiff) {
  
  var due;
  var time = secondsToTime(timeDiff);
  
  if(timeDiff <= 60) {
    due = '1 min';
  }
  else if(timeDiff < 3600) {
    if(time.m == 1) {
      due = '1 min';
    }
    else {
      due = time.m + ' mins';
    }
  }
  else if(time.h == 1){
    if(time.m == 1) {
      due = time.h + ' hour ' + time.m + ' min';
    }
    else {
      due = time.h + ' hour ' + time.m + ' mins';
    }
  }
  else {
    if(time.m == 1) {
      due = time.h + ' hours ' + time.m + ' min';
    }
    else {
      due = time.h + ' hours ' + time.m + ' mins';
    }
  }
  
  return due;
}