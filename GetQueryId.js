import axios from "axios";
import fs from "fs";

async function GetQueryId(QraphlName) {

    //Get mainJsId for request Url
    let mainJsId = await axios("https://twitter.com", {
        "headers": {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.93 Safari/537.36"
        },
        "method": "GET"
    })
        .then((response) => { return response.data.match(/(?<=web\/main\.).*?(?=\.js)/)[0]; })
        .catch(() => { console.log('get mainJsId fail.'); return -1; });

    if (mainJsId === -1) { return -1; }

    //Check main.xxxxxxxx.js is newest or not. If is newest then skip download main.js and output.
    let QueryIdListData = "";
    try { QueryIdListData = JSON.parse(fs.readFileSync(`./QueryIdList.json`)); }
    catch (err) { console.log('Failed to load QueryIdList.json now clear old file and rebuild one.'); fs.writeFileSync(`./QueryIdList.json`, JSON.stringify({})); }

    if (QueryIdListData.mainJsId != mainJsId) {

        //Prase main.xxxxxxxx.js file to get queryId 
        let mainJsUrl = 'https://abs.twimg.com/responsive-web/client-web/main.' + mainJsId + '.js';
        QueryIdListData = await axios(mainJsUrl, {
            "headers": {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.93 Safari/537.36"
            },
            "method": "GET"
        })
            .then((response) => {

                let rawList = response.data.match(/queryId:"([^"]+)",operationName:"([^"]+)"?(?=,operationType:"query")/g);

                let operateName = [];
                let operateId = [];

                for (let i = 0, operate = ""; i < rawList.length; i++) {

                    operate = rawList[i];
                    operateId.push(operate.match(/(?<=queryId:").*?(?=")/)[0]);
                    operateName.push(operate.match(/(?<=operationName:").*?(?=")/)[0]);

                }

                let outputJson = { "mainJsId": mainJsId, "QueryId": {} };
                for (let i = 0; i < operateId.length; i++) {
                    outputJson.QueryId[operateName[i]] = operateId[i];
                }
                return outputJson;

            })
            .catch(() => { console.log('get mainJsData fail.'); return -1; });

        if (QueryIdListData === -1) { return -1; }

        //update QueryIdList.json
        fs.writeFileSync(`./QueryIdList.json`, JSON.stringify(QueryIdListData, "", "\t"));


    }
    if (Array.isArray(QraphlName)) {

        const returnArray = new Array(QraphlName.length);

        for (let i = 0, operate = ""; i < QraphlName.length; i++) {
            operate = QraphlName[i];
            returnArray[i] = QueryIdListData.QueryId[`${operate}`];
        }

        return returnArray;

    }
    else if (typeof QraphlName === 'string') { return QueryIdListData.QueryId[`${QraphlName}`]; }
    else {
        console.log("Please only enter Array or string.");
        return -1;
    }

}

export default GetQueryId;




