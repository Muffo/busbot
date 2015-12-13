function initBot() {
 
  var props = PropertiesService.getScriptProperties();
 
  props.setProperties({
    TWITTER_CONSUMER_KEY: "XXXXXXXXXXXXXXXXXXXXXXXXX",
    TWITTER_CONSUMER_SECRET: "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    TWITTER_ACCESS_TOKEN: "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    TWITTER_ACCESS_SECRET: "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    MAX_TWITTER_ID: 0,
    USERS_NOTIFICATION: "[]",
    TWEET_NUM: 0,
  });
 
  // The MAX_TWITTER_ID property store the ID of the last tweet answered by the bot
  
  // Delete exiting triggers, if any...why??
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    ScriptApp.deleteTrigger(triggers[i]);
  }
 
  // Setup a time-based trigger for the Bot to fetch and process incoming Tweets 
  // every minute. If your Google Script is running out of quota, change the
  // time to 5 or 10 minutes though the bot won't offer real-time answers then.
  ScriptApp.newTrigger("busBot")
    .timeBased()
    .everyMinutes(1)
    .create();
 
}


function processTweet(tweet) {  
  // Ignore tweets that are sensitive (NSFW content)
  if (tweet.possibly_sensitive || tweet.user.screen_name === "bu5bot") {
    Logger.log("Skipping tweet from @" + tweet.user.screen_name + ": " + tweet.text + " + (ID: " + tweet.id_str + ")");
    return;
  }
  
  return {
    id_str: tweet.id_str,
    user: tweet.user.screen_name,
    text: tweet.text
  };
}
 
function busBot() {

  Logger = BetterLog.useSpreadsheet('XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'); 
  var props = PropertiesService.getScriptProperties(),
      users = JSON.parse(props.getProperty("USERS_NOTIFICATION"));

  try {
   
    var twit = new Twitter.OAuth(props),
        nextPassage = getNextLimerickPassage();
    
    if (nextPassage === null) {
      if (twit.sendTweet("Sorry but I cannot get real time info at the moment") === null) {
        Logger.log("Failed to send the tweet about the missing real time info");
      }
    }
    else {
      var tweetNum = parseInt(props.getProperty("TWEET_NUM"));
      if (twit.sendTweet(nextPassage.text + " - #" + tweetNum) === null) {
        Logger.log("Failed to send the tweet about the passage: " + nextPassage.text);
      }
      props.setProperty("TWEET_NUM", tweetNum+1);
    }
    
    // ****************************************************************************
    // Send notifications
    // ****************************************************************************
    
    if (nextPassage !== null && nextPassage.waitTime <= 650) {
      for (var i = users.length - 1; i >= 0; i--) {
        if (twit.sendTweet("Hey @" + users[i] + " ! " + nextPassage.text) === null) {
          Logger.log("Failed to send the notification to @" + users[i]);
          MailApp.sendEmail("notification-email@gmail.com",
                            "Failed to send the notification to @" + users[i] + ": " + nextPassage.text,
                            JSON.stringify(nextPassage));
        }
        else {
          // Remove the user from the list
          users.splice(i, 1);
        }
        // Wait a second to avoid hitting the rate limits
        Utilities.sleep(1000);
      }
    }
    
    
    // ****************************************************************************
    // Look for new mentions
    // ****************************************************************************

    var tweets = twit.fetchTweets("to:@bu5bot", processTweet, {      
      multi: true,
      count: 5,    // Process # tweets in a batch
      since_id: props.getProperty("MAX_TWITTER_ID")
    });
      
    
    if (tweets.length === 0) {
      Logger.log("Fetching for tweets to:@bu5bot since_id = " + props.getProperty("MAX_TWITTER_ID") + " returned 0 results");
    }
    else {
      props.setProperty("MAX_TWITTER_ID", tweets[0].id_str);
      Logger.log("Fetching for tweets to:@bu5bot since_id = " + props.getProperty("MAX_TWITTER_ID") + " returned " + tweets.length + " new mentions");
      
      // Process the tweets in FIFO order
      for (var i = tweets.length - 1; i >= 0; i--) {
        
        var tweet = tweets[i];
        Logger.log("Processing tweet from @" + tweet.user + ": " + tweet.text + " + (ID: " + tweet.id_str + ")")
        
        if (users.indexOf(tweet.user) > -1) {
          tweet.answer = "Hi @" + tweet.user + " ! You have already subscribed for the notification";
        }
        else {
          if (nextPassage === null) {
            tweet.answer = "Hi @" + tweet.user + " ! Real time info are not available now, but I'll do my best to notify you 10 minutes before the next bus for Limerick";  
          } else if (nextPassage.waitTime < 600) {
            tweet.answer = "Hurry up @" + tweet.user + " ! " + nextPassage.text;
          } else {
            tweet.answer = "Hi @" + tweet.user + " !  " + nextPassage.text + ". I'll notify you 10 minutes before it departs";  
          }
          users.push(tweet.user);
        }
        
        var res = twit.sendTweet(tweet.answer, {
          in_reply_to_status_id: tweet.id_str
        });
        
        if (res === null)
          Logger.log("Failed to send tweet: " + tweet.answer);
        else
           Logger.log("Sent answer to @" + tweet.user + ": " + tweet.answer);
        
        Utilities.sleep(1000);
      }
    }
    
    Logger.log("Updated USERS_NOTIFICATION = " + JSON.stringify(users));
    props.setProperty("USERS_NOTIFICATION", JSON.stringify(users));
  
  } catch (e) {
    
    props.setProperty("USERS_NOTIFICATION", JSON.stringify(users));
    e = (typeof e === 'string') ? new Error(e) : e;
    
    Logger.log('%s: %s (line %s, file "%s"). Stack: "%s" .',e.name||'', 
                e.message||'', e.lineNumber||'', e.fileName||'', e.stack||'');
    throw e;
  }
}