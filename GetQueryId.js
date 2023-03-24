import axios from "axios";
import fs from "fs";
import * as path from 'path'
import { fileURLToPath } from 'url';

const rootFloder = `${path.dirname(fileURLToPath(import.meta.url))}`;

async function GetQueryId(QraphlName, noCheck, forcedUpdate) {

    try {
        noCheck = noCheck || false;
        forcedUpdate = forcedUpdate || false;
        let apiId = "";
        let QueryIdListData = {};
        try { QueryIdListData = JSON.parse(fs.readFileSync(`${rootFloder}\\data_json\\QueryIdList.json`)); }
        catch (err) {
            try { 
                console.log('Failed to load QueryIdList.json now clear old file and rebuild one.');
                fs.writeFileSync(`${rootFloder}\\data_json\\QueryIdList.json`, JSON.stringify({}));
                QueryIdListData = {};
            }
             catch (err) {
                 fs.mkdirSync(`${rootFloder}\\data_json`, { recursive: true });
                 fs.writeFileSync(`${rootFloder}\\data_json\\QueryIdList.json`, JSON.stringify({}));
                 QueryIdListData = {};
             }
        }

        if (!noCheck || !Object.keys(QueryIdListData).length || forcedUpdate) {
            //Get apiId for request Url
            apiId = await axios("https://twitter.com/", {
                "method": "GET"
            })
                .then((response) => {
                    return response.data.match(/(?<=\,api\:\").*?(?=\"\,\")/)[0];
                })
                .catch((err) => { console.log('get api Id fail.'); Promise.reject(new Error(err)); });
            /*
            mainJsId = await axios("https://twitter.com/", {
                "headers": {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.93 Safari/537.36"
                },
                "method": "GET"
            })
                .then((response) => { return response.data.match(/(?<=web-legacy\/main\.).*?(?=\.js)/)[0]; })
                .catch((err) => { console.log('get apiId fail.'); Promise.reject(new Error(err)); });
                //OLD WAY
            */
        }
        //Check main.xxxxxxxx.js is newest or not. If is newest then skip download main.js and output.


        if ((QueryIdListData.apiId != apiId && !noCheck) || !Object.keys(QueryIdListData).length || forcedUpdate) {

            //Prase main.xxxxxxxx.js file to get queryId 
            //let mainJsUrl = 'https://abs.twimg.com/responsive-web/client-web-legacy/main.' + apiId + '.js'; //OLD WAY
            let mainJsUrl = 'https://abs.twimg.com/responsive-web/client-web-legacy/api.' + apiId + "a" + '.js';
            QueryIdListData = await axios(mainJsUrl, {
                "headers": {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.93 Safari/537.36"
                },
                "method": "GET"
            })
                .then((response) => {

                    let rawList = response.data.match(/queryId\:\"([^"]+)\"\,operationName\:\"([^"]+)\"\,operationType\:\"query\"\,metadata\:\{featureSwitches\:\[([^\[\]]+)?(?=\]\})/g);

                    let operateName = [];
                    let operateId = [];
                    let queryRawList = [];
                    let operateQuery = {};

                    for (let i = 0, operate = ""; i < rawList.length; i++) {

                        operate = rawList[i];

                        operateId.push(operate.match(/(?<=queryId:").*?(?=")/)[0]);
                        operateName.push(operate.match(/(?<=operationName:").*?(?=")/)[0]);
                        if (operate.match(/(?<=featureSwitches:\[).*/)[0] !== "") {
                            queryRawList = operate.match(/(?<=featureSwitches:\[).*/)[0].match(/(?<=\")([^",]+)(?=\")/g);
                        }
                        else {
                            queryRawList = [""];
                        }
                        operateQuery[operateName[i]] = [];
                        for (let j = 0; j < queryRawList.length; j++) {
                            operateQuery[operateName[i]].push(queryRawList[j]);
                        }

                    }

                    let outputJson = { "apiId": apiId, "queryInfo": {} };
                    for (let i = 0; i < operateId.length; i++) {
                        outputJson.queryInfo[operateName[i]] = {
                            "queryId": operateId[i],
                            "queryToken": operateQuery[operateName[i]]
                        };
                    }
                    return outputJson;

                })
                .catch((err) => {
                    console.log('get mainJsData fail.');
                    return Promise.reject(new Error(err));
                });


            //update QueryIdList.json
            fs.writeFileSync(`${rootFloder}\\data_json\\QueryIdList.json`, JSON.stringify(QueryIdListData, null, "    "));


        }
        if (Array.isArray(QraphlName)) {

            const returnArray = new Array(QraphlName.length);

            for (let i = 0, operate = ""; i < QraphlName.length; i++) {
                operate = QraphlName[i];
                returnArray[i] = QueryIdListData.queryInfo[`${operate}`];
            }

            return returnArray;

        }
        else if (typeof QraphlName === 'string') {

            if (QraphlName === "all") {
                return QueryIdListData;
            }
            else {
                return QueryIdListData.queryInfo[`${QraphlName}`];
            }
        }
        else {
            throw new Error("Only accept Array or string.");
        }
    } catch (err) {
        console.log(err);
        return -1;
    }

}

export default GetQueryId;
