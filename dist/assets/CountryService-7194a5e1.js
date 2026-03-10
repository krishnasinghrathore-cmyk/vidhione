const t={getCountries(){return fetch("/demo/data/countries.json",{headers:{"Cache-Control":"no-cache"}}).then(e=>e.json()).then(e=>e.data)}};export{t as C};
