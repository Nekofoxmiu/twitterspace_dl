# twitterspace_dl.js module

```
This project import axios.
And rely on ffmpeg to download space.
Please put ffmpeg.exe and twitterspace_dl.js in the same folder or set ffmpeg.exe in enviroment.
```

> **use way**

```javascript
TwitterSpace(whoseSpace, cookie, configObj)

//default
configObj = {
  "record": true,
  "outputPath": "./",
  "searchByName": true,
  "saveIds": false
}
```
**Async function**

1. whoseSpace accept string or number.  

2. auth_data is an object that must contain Twitter's "auth_token", "ct0" 
and "x-csrf-token" which you need to check your browser's dev-tool.

3. record accept true/false/"true"/"false"  
(When true it will start recording space.)  

4. outputPath accept string  

5. searchByName accept string or number  
(When true it will get space data by username, or it will get space data by rest_id.)  

6. saveIds accept true/false/"true"/"false"   
(When true it will get space data by saving data, if it is not in data will save it to "./ID_List.json".)  
**NOTICE : When saveIds true space data will only contain name and id**

7. Return rule: 
   - User's space open and sucess get m3u8 return object:
   ```javascript
   
   returnObject = {
    "title": broadcastTitle,
    "m3u8": Spacem3u8,
    "nameOrId": userName_or_userId,
    "spaceId": spaceId,
    "broadcastId": broadcastId,
    "spaceData": spaceData,
    "userData": userData
   }
   
   ```
   - User's space not open return 2
   - Something go wrong return -1

> **example**
```javascript
TwitterSpace("omarupolka")
//Will start recording Polka's space and return fulldata object.

TwitterSpace("omarupolka", {"record": false})
//Will only return fulldata object.

//1270551806993547265 is omarupolka's rest_id
TwitterSpace("1270551806993547265", {"record": true, "outputPath": "./spacesave", "searchByName": false})
//Will start recording Polka's space saving it to "./spacesave" and return fulldata object.

TwitterSpace("1270551806993547265", {"record": true, "outputPath": "./spacesave", "searchByName": false, "saveIds": true})
/*
Will start recording Polka's space saving it to "./spacesave", create json file save ids, 
and return object that the obj.spaceData only contain name and id.

obj.spaceData = {
  name: userName,
  id: userId
}
*/
```
8. Some alias  

```javascript
TwitterSpace.getTitle(whoseSpace);
TwitterSpace.getM3u8(whoseSpace);
TwitterSpace.getName(whoseSpace);
TwitterSpace.getId(whoseSpace);
TwitterSpace.getSpaceId(whoseSpace);
TwitterSpace.getBroadcastId(whoseSpace);
TwitterSpace.getSpaceData(whoseSpace);
TwitterSpace.getUserData(whoseSpace);
//Just call the above TwitterSpace function won't save anytime.
```
## Small additional module: GetQueryId.js
```
This module import axios too.
Can use without twitterspace_dl.js.
```
> **use way**

```javascript
GetQueryId("QraphlName", noCheck, forcedUpdate)
```
**Async function**
QraphlName accept string and array.
1. If input string will return object, input array will return object array with same sequence.
2. It will save all Query data to ./QueryIdList.json.
3. noCheck will skip version check.
4. forcedUpdate will forced update Token.json.
> **example**
```javascript
GetQueryId(["HomeTimeline", "BizProfileFetchUser", "UsersByRestIds"])
//output: 
    [
        {
            "queryId": "Sy5ZGGmqWbf8yu4gwsno1w",
            "queryToken": [
                "dont_mention_me_view_api_enabled",
                "interactive_text_enabled",
                "responsive_web_uc_gql_enabled",
                "vibe_tweet_context_enabled",
                "responsive_web_edit_tweet_api_enabled",
                "standardized_nudges_misinfo",
                "responsive_web_enhance_cards_enabled"
            ]
        },
        {
            "queryId": "o3OXj0LtB6MkqfR7o3_Fig",
            "queryToken": [
                ""
            ]
        },
        {
            "queryId": "f90_j1q82GqKXj5FbkrL1w",
            "queryToken": [
                ""
            ]
        }
    ]
GetQueryId("HomeTimeline")
//output: {
			"queryId": "Sy5ZGGmqWbf8yu4gwsno1w",
			"queryToken": [
				"dont_mention_me_view_api_enabled",
				"interactive_text_enabled",
				"responsive_web_uc_gql_enabled",
				"vibe_tweet_context_enabled",
				"responsive_web_edit_tweet_api_enabled",
				"standardized_nudges_misinfo",
				"responsive_web_enhance_cards_enabled"
			]
		}
```
## Realese EXE

Just past the url without ?=20 or something like that, then start to download.  
  
source code:  
```JS
import TwitterSpace from 'twitterspace_dl';
import child_process from "child_process";
import * as readlinePromises from 'node:readline/promises';
import path from 'path';
import { fileURLToPath } from 'url';
function wait(ms) {
    return new Promise(resolve => setTimeout(() => resolve(), ms));
};
const mainFolder = path.dirname(fileURLToPath(import.meta.url));
const openplace = process.cwd();

console.log("資料存在：", mainFolder, " 要清除乾淨請至此資料夾刪除");
let rl = readlinePromises.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});
rl.on('line', line => {
    console.log(`Received: ${line}`);
    if (line === "close") {
      rl.close();
    } else {
      rl.prompt();
    }
  });

 
let URL = await rl.question('URL? \n');
rl.pause();
console.log("處理中，請稍候");
let spaceId;
try { spaceId = URL.match(/(?<=spaces\/).+/)[0];} catch {console.log("網址輸入錯誤"); await wait(5000).then(() => {process.exit();});}
let spacedata = await TwitterSpace.getSpaceData_FromSpaceId(spaceId);
console.log(spacedata)
child_process.exec(`start cmd /K ffmpeg -i ${spacedata.m3u8} "${openplace}/${spacedata.title}.m4a"`, {
    cwd: mainFolder
  }, async (error, stdout, stderr) => {
    if (stderr) console.log(stderr);
  });
  await rl.question('按任意鍵關閉');
  rl.close;
```
