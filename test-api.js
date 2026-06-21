const http = require('http');

const req = http.request({
    hostname: 'localhost',
    port: 8080,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
}, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        const token = JSON.parse(data).token;
        const req2 = http.request({
            hostname: 'localhost',
            port: 8080,
            path: '/api/deals',
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        }, (res2) => {
            let data2 = '';
            res2.on('data', chunk => data2 += chunk);
            res2.on('end', () => {
                const deals = JSON.parse(data2);
                if (deals.length > 0) {
                    console.log("Sample Deal Brokerage Fields:", {
                        pBrokerage: deals[0].pBrokerage,
                        sBrokerage: deals[0].sBrokerage,
                        pbrokerage: deals[0].pbrokerage,
                        sbrokerage: deals[0].sbrokerage,
                        pBrokerageVal: deals[0]['pBrokerage'],
                    });
                }
            });
        });
        req2.end();
    });
});
req.write(JSON.stringify({ username: 'admin', pin: 'PULSE99' }));
req.end();
