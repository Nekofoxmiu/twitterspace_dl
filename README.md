# twitterspace_dl.js module

```
This project import axios.
And rely on ffmpeg to download space.
Please put ffmpeg.exe and twitterspace_dl.js in the same folder.
```

> **use way**

```javascript
TwitterSpace("TwitterUserScreenName", downloadSpaceOrNot, "downloadOutputPath")
```
**Async function**

1. TwitterUserScreenName accept string.
2. downloadSpaceOrNot accept true/false/"true"/"false" (Can skip. Default is true.)
3. downloadOutputPath accept string (Can skip. Default is "./")
4. Return rule: 
   - User's space open and sucess get m3u8 rreturn m3u8.
   - User's space not open return 2
   - Something get wrong return -1

> **example**
```javascript
TwitterSpace("omarupolka", true, "./")
//Will start recording Polka's space and return m3u8 url.

TwitterSpace("omarupolka", false)
//Will only return m3u8 url.
```
## Small additional module: GetQueryId.js
```
This module import axios too.
Can use without twitterspace_dl.js.
```
> **use way**

```javascript
GetQueryId("QraphlName")
```
**Async function**
QraphlName accept string and array.
1. If input string will return string, input array will return array with same sequence.
2. It will save all QueryId to ./QueryIdList.json.
> **example**
```javascript
GetQueryId(["HomeTimeline", "BizProfileFetchUser", "CommunityModeratorsTimeline"])
//output: ['bkgUzmWplULW-ncjplP5Tw','o3OXj0LtB6MkqfR7o3_Fig','uJC_rT_soX7ePpHF9hXnpw']

GetQueryId("HomeTimeline")
//output: bkgUzmWplULW-ncjplP5Tw
```
