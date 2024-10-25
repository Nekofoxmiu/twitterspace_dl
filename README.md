
# Twitter Space Downloader

This project is designed to download Twitter Spaces using the `twitterspace_dl.js` module, with `axios` for HTTP requests and `ffmpeg` for audio processing.

## Requirements

- **Node.js** and **npm** (for JavaScript dependencies)
- **ffmpeg**: Place `ffmpeg.exe` in the same folder as `twitterspace_dl.js` or add it to the system environment path.

## Installation

1. Install required Node.js dependencies:
   ```bash
   npm install axios
   ```

2. Place `ffmpeg.exe` in the project directory or configure it in the system environment.

## Usage

The main function for downloading Twitter Spaces is `TwitterSpace(whoseSpace, auth_data, configObj)`.

### Parameters

- `whoseSpace` - Twitter username or rest_id (string or number).
- `auth_data` - Twitter authentication details in an object format:
    ```javascript
    auth_data = {
      "ct0": "xxxxxxxxxxxxxxxxxxx",
      "auth": "xxxxxxxxxxxxxxxxxxxxx"
    }
    ```
  - These values are available in the browser's Developer Tools under the "Cookies" section.

- `configObj` (optional) - Configuration object:
    ```javascript
    configObj = {
      "record": true,          // Start recording if true
      "outputPath": "./",       // Directory to save output files
      "searchByName": true,     // Search by username (true) or by rest_id (false)
      "saveIds": false          // Save downloaded Space IDs
    }
    ```

### Return Values

- On success, returns an object with details about the Twitter Space:
    ```javascript
    {
      "title": broadcastTitle,
      "m3u8": Spacem3u8,
      "nameOrId": userName_or_userId,
      "spaceId": spaceId,
      "broadcastId": broadcastId,
      "spaceData": spaceData,
      "userData": userData
    }
    ```
- If the Space is not live, it returns `2`.
- On error, it returns `-1`.

### Examples

#### Example 1: Start recording Polka's Space

```javascript
const twitterSpace = new TwitterSpace(auth_data, configObj);
twitterSpace.execute("omarupolka").then((result) => {
  console.log(result);
}).catch((error) => {
  console.error("Error:", error);
});
```

#### Example 2: Only return Space data without recording

```javascript
const twitterSpace = new TwitterSpace(auth_data, { record: false });
twitterSpace.execute("omarupolka").then((result) => {
  console.log(result);
}).catch((error) => {
  console.error("Error:", error);
});
```

#### Example 3: Record Polka's Space using rest_id

```javascript
const twitterSpace = new TwitterSpace(auth_data, { record: true, outputPath: "./spacesave", searchByName: false });
twitterSpace.execute("1270551806993547265").then((result) => {
  console.log(result);
}).catch((error) => {
  console.error("Error:", error);
});
```

#### Example 4: Save IDs of downloaded Spaces

```javascript
const twitterSpace = new TwitterSpace(auth_data, { record: true, outputPath: "./spacesave", searchByName: false, saveIds: true });
twitterSpace.execute("1270551806993547265").then((result) => {
  console.log(result);
}).catch((error) => {
  console.error("Error:", error);
});
```

## Additional Aliases

`TwitterSpace` offers shortcut functions for specific data retrieval:

- `TwitterSpace.getM3u8_FromBroadcastId(broadcastId)`
- `TwitterSpace.getM3u8_FromSpaceId(spaceId)`
- `TwitterSpace.getSpaceData_FromSpaceId(spaceId)`

## Additional Module: GetQueryId.js

The `GetQueryId.js` module is used to retrieve GraphQL query IDs for Twitter's API.

### Usage

```javascript
const getQueryId = new GetQueryId(botConfig);
getQueryId.getQueryId("HomeTimeline").then((queryId) => {
  console.log("HomeTimeline's queryId:", queryId);
}).catch((error) => {
  console.error("Failed to retrieve queryId:", error);
});
```

### Parameters

- `GraphQLName`: Name of the GraphQL query (string or array).
- `noCheck`: Skip version check (boolean).
- `forcedUpdate`: Force update of Token.json (boolean).

### Examples

Retrieve data for multiple GraphQL queries:

```javascript
const getQueryId = new GetQueryId(botConfig);
getQueryId.getQueryId(["HomeTimeline", "BizProfileFetchUser", "UsersByRestIds"]).then((result) => {
  console.log(result);
}).catch((error) => {
  console.error("Failed to retrieve queryId:", error);
});
```

Retrieve data for a single query:

```javascript
const getQueryId = new GetQueryId(botConfig);
getQueryId.getQueryId("HomeTimeline").then((queryId) => {
  console.log("HomeTimeline's queryId:", queryId);
}).catch((error) => {
  console.error("Failed to retrieve queryId:", error);
});
```
