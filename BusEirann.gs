function getNextLimerickPassage() {
  
  try {
     var request_options = {
       "method": "get"
     };

    // This is hardcoded for the Ballycasey Opp Old Lodge bus stop
    var url = "http://www.buseireann.ie/inc/proto/stopPassageTdi.php?stop_point=6350786630982641495&_=1446809752646"
    response = UrlFetchApp.fetch(url, request_options);
    
    if (response.getResponseCode() !== 200) {
      Logger.log(response);
      return null;
    }
      
    var nextPassage = {
      waitTime: 999999
    };
    
    var data = JSON.parse(response.getContentText());
    if (data) {
      
      var now = getTimestamp();
      
      for( var key in data['stopPassageTdi'] ) {
        
        if (key === "foo")
          continue;
        
        var passage = data['stopPassageTdi'][key];
        var departure = passage.departure_data;
        var destination = departure.multilingual_direction_text.defaultValue;
        
        // Ignore all but Limerick buses
        if (destination !== "Limerick")
          continue;
        
        passage.actual = departure.actual_passage_time_utc;
        passage.scheduled = departure.scheduled_passage_time_utc;
        
        
        if (passage.actual) 
          passage.waitTime = parseInt(passage.actual - now);
        else
          passage.waitTime = parseInt(passage.scheduled - now);
        
        // Ignore passages that happened before of 5 minutes ago
        if (passage.waitTime < -300)
          continue;
        
        passage.waitTimeString = timeString(passage.waitTime);
        
        if (!passage.actual)
          passage.waitTimeString += " (scheduled)";
        
        Logger.log("Passage for Limerick due in  " + passage.waitTimeString + " ( " + passage.waitTime + ")");
        
        if (passage.waitTime < nextPassage.waitTime) {
          nextPassage = passage;
        }
      }
    }
    
    if (!nextPassage.waitTimeString) {
      Logger.log("Failed to get info from BusEireann on next passage. See data below");
      Logger.log(JSON.stringify(data));
      return null;
    }
    
    if (nextPassage.waitTime > 0) {
      nextPassage.text = "The bus for Limerick is due in " + nextPassage.waitTimeString;
    } else {
      nextPassage.text = "The bus for Limerick has just departed";
      if (nextPassage.actual) {
        var delayString = timeString(nextPassage.actual - nextPassage.scheduled);
        nextPassage.text +=  " with a #delay of " + delayString;
      }
    }
    
    Logger.log("Result: " +  nextPassage.text);
    
    return nextPassage;

      
  } catch (e) {
    Logger.log(JSON.stringify(e));
    throw e;
  }
}

