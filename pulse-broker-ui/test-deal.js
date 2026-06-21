const axios = require('axios');
axios.get('http://localhost:8080/api/deals').then(res => {
    console.log(JSON.stringify(res.data, null, 2));
}).catch(console.error);
