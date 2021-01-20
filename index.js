
function start() {

  handles = [ "traefik", "digitalocean", "nginx", "medium-google-cloud", "medium-microsoft-azure",
  "erwinstaal", "github", "thenewstack", "alcide", "percona", "itnext", "lawrencejones", "bridgecrew"];

  handles.forEach(function(handle){          
           feed = getFeed(handle)[0][1]; // search the sheet "websites" for the right RSS feed url
           console.log("Now processing: "+feed);
           fetchFeed(feed,handle); // go to RSS feed url and gather all items
  });    

  var property = PropertiesService.getDocumentProperties();
  property.setProperty('last_update', new Date().getTime()); // set the last update so we dont send duplicates
}

function fetchFeed(url,handle) {

  var spreadsheet, handleSheet, sourceSheet, targetValues;
  
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var handleSheet = spreadsheet.getSheetByName(handle);
  if (!handleSheet) {
    spreadsheet.insertSheet(handle);
    handleSheet = spreadsheet.getSheetByName(handle);
  }
  var property = PropertiesService.getDocumentProperties();
  var last_update = property.getProperty('last_update');

  var feed = UrlFetchApp.fetch(url).getContentText();
  var items = getItems(feed);

  var i = items.length - 1;
  while (i > -1) {
    var item = items[i--];
    var date = new Date(item.getChildText('pubDate'));
    if (date.getTime() > last_update) {
      insertRow(item, handleSheet);
    }
  }
  
}

function getItems(feed) {
  var doc = XmlService.parse(feed);
  var root = doc.getRootElement();
  var channel = root.getChild('channel');
  console.log(doc,root);
  var items = channel.getChildren('item');
  return items;
}

function insertRow(item, sheet) {
  var title = item.getChildText('title');
  var url = item.getChildText('link');
  var author = item.getChildText('author');
  var date = new Date(item.getChildText('pubDate'));
  sheet.insertRowBefore(2);
  sheet.getRange('B2:E2').setValues([[title, url, author, date.toLocaleString()]]);
  
  // send to telegram
  sendTelegram(title + " - " + url + " - " + date.toLocaleString());
  // send tweet
//  sendTweet(title + " => " + url);
}

function sendTelegram(item){
  var options = {
  'method' : 'post',
  'contentType': 'application/json',
  };
  var encodedText = encodeURIComponent(item);
  telegram_bot_id = PropertiesService.getDocumentProperties().getProperty("telegram_bot_id");
  console.log(telegram_bot_id);
  UrlFetchApp.fetch('https://api.telegram.org/bot'+ telegram_bot_id +'/sendMessage?chat_id=-474319507&text=' + encodedText, options);
}

function sendTweet(item) {
  var props = PropertiesService.getScriptProperties();
  props.setProperties(twitterKeys);
  var params = new Array(0);
  var service = new Twitterlib.OAuth(props);

  if (!service.hasAccess()) {
    console.log("Authentication Failed");
  } else {
    console.log("Authentication Successful");      
    try {
      var response = service.sendTweet(item, params);
      console.log(response);
    } catch (e) {	console.log(e)	}
  }
}

function getFeeds() {

  var spreadsheet, targetSheet, sourceSheet, targetValues;
    spreadsheet = SpreadsheetApp.getActive();
    sourceSheet = spreadsheet.getSheetByName("websites");
    targetValues = sourceSheet.getRange(1, 1, 20, 2).getValues();
  return targetValues;
}

// filder for a single feed
function getFeed(handle) {

  var spreadsheet, targetSheet, sourceSheet, targetValues;
    spreadsheet = SpreadsheetApp.getActive();
    sourceSheet = spreadsheet.getSheetByName("websites");
    targetValues = sourceSheet.getRange(1, 1, 20, 2).getValues().filter(function (r) {
    if( r[0] == handle)
      return r[1];
    });
  return targetValues;
}

