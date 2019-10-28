// Built-in Node.js modules
var fs = require('fs')
var path = require('path')

// NPM modules
var express = require('express')
var sqlite3 = require('sqlite3')


var public_dir = path.join(__dirname, 'public');
var template_dir = path.join(__dirname, 'templates');
var db_filename = path.join(__dirname, 'db', 'usenergy.sqlite3');

var app = express();
var port = 8000;

// open usenergy.sqlite3 database
var db = new sqlite3.Database(db_filename, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
        console.log('Error opening ' + db_filename);
    }
    else {
        console.log('Now connected to ' + db_filename);
		TestSQL();
    }
});
function TestSQL()
{
     /*   db.all('SELECT * FROM Consumption WHERE year = ? ORDER BY state_abbreviation',['1960'],(err,rows) =>{
			rows.forEach(function (row) {
				console.log(row.state_abbreviation,row.year);
		})
		
	});*/
	
}

app.use(express.static(public_dir));


// GET request handler for '/'
app.get('/', (req, res) => {
    ReadFile(path.join(template_dir, 'index.html')).then((template) => {
        let response = template;
		var stringHold = "";
		var replacePromise= new Promise((resolve,reject)=>{
			db.all("SELECT * FROM Consumption ORDER BY year", (err,rows) =>{
				rows.forEach(function (row) {
					stringHold=stringHold+"<tr>"+"<td>"+row.state_abbreviation+"</td>" +"<td>"+row.coal+"</td>"+"<td>"+row.natural_gas+"</td>"+"<td>"+row.nuclear+"</td>"+"<td>"+row.petroleum+"</td>"+"<td>"+row.renewable+"</td>"+"</tr>";
					})
					resolve(stringHold);
			});
		})
			replacePromise.then(data=>{
				response=response.replace("replace",data);
				WriteHtml(res, response);
			});
			
    }).catch((err) => {
        Write404Error(res);
    });
});

// GET request handler for '/year/*'
app.get('/year/:selected_year', (req, res) => {
    ReadFile(path.join(template_dir, 'year.html')).then((template) => {
        let response = template;
		let year = req.url.substring(6);
		var stringHold = "";
		var replacePromise= new Promise((resolve,reject)=>{
			db.all('SELECT * FROM Consumption WHERE year = ? ORDER BY state_abbreviation',[year],(err,rows) =>{
				rows.forEach(function (row) {
					total=row.coal+row.natural_gas+row.nuclear+row.petroleum+row.renewable;
					stringHold=stringHold+"<tr>"+"<td>"+row.state_abbreviation+"</td>" +"<td>"+row.coal+"</td>"+"<td>"+row.natural_gas+"</td>"+"<td>"+row.nuclear+"</td>"+"<td>"+row.petroleum+"</td>"+"<td>"+row.renewable+"</td>"+"<td>"+total+"</td>"+"</tr>";
					})
					resolve(stringHold);
			});
		})
			replacePromise.then(data=>{
				response=response.replace("replace",data);
				response= response.replace("In Depth Analysis", "In Depth Analysis of "+year);
				WriteHtml(res, response);
			});
    }).catch((err) => {
        Write404Error(res);
    });
});

// GET request handler for '/state/*'
app.get('/state/:selected_state', (req, res) => {
    ReadFile(path.join(template_dir, 'state.html')).then((template) => {
        let response = template;
		let state=req.url.substring(7);
		let stringHold="";
		let stateName =[];
		let coal_counts=[];
		let natural_counts=[];
		let petroleum_counts=[];
		let renewable_counts=[]; 
		let nuclear_counts =[];

		var replacePromise= new Promise((resolve,reject)=>{
			db.each('SELECT * FROM States WHERE state_abbreviation = ?',[state],(err,rows)=>{stateName= rows.state_name});
			db.all('SELECT * FROM Consumption WHERE state_abbreviation = ? ORDER BY year',[state],(err,rows) =>{
				rows.forEach(function (row) {
					coal_counts.push(row.coal);
					natural_counts.push(row.natural_gas);
        			nuclear_counts.push(row.nuclear);
        			petroleum_counts.push(row.petroleum);
        			renewable_counts.push(row.renewable);
					total=row.coal+row.natural_gas+row.nuclear+row.petroleum+row.renewable;
					stringHold=stringHold+"<tr>"+"<td>"+row.year+"</td>" +"<td>"+row.coal+"</td>"+"<td>"+row.natural_gas+"</td>"+"<td>"+row.nuclear+"</td>"+"<td>"+row.petroleum+"</td>"+"<td>"+row.renewable+"</td>"+"<td>"+total+"</td>"+"</tr>";
					})
					resolve(stringHold);
			});
		})
			replacePromise.then(data=>{
				response=response.replace("replace",data);
				response=response.replace("Yearly Snapshot", "Yearly Snapshot of "+ stateName);
				response= response.replace("In Depth Analysis", "In Depth Analysis of "+stateName);
				image = "/images/"+state+".jpg";
				response= response.replace("/images/noimage.jpg",image);
				response= response.replace("var state;", "var state =" + state + ";");
				WriteHtml(res, response);
			});
        // modify `response` here
    }).catch((err) => {
        Write404Error(res);
    });
});

// GET request handler for '/energy-type/*'
app.get('/energy-type/:selected_energy_type', (req, res) => {
    ReadFile(path.join(template_dir, 'energy.html')).then((template) => {
        let response = template;
        let energy = req.url.substring(13);
        let stringHold = ""; 
        var data = {};
        totals = new Array (58).fill(0);
	   
  		var replacePromise = new Promise((resolve,reject)=> {
  			db.all('SELECT * FROM Consumption ORDER BY year,state_abbreviation',(err,rows)=>{
  				rows.forEach(function (row) {
  					//check if the year already exists (hasOwnProperty(key))
  					if(data.hasOwnProperty(row.year)!= true)
  					{
  						data[row.year] = new Object ();
  					}
  					data[row.year][row.state_abbreviation] = row[energy];

  				})

  				let k =0; 
  				for(let i =1960; i < 2018; i ++)
  				{
  					stringHold = stringHold + "<tr>" + "<td> " + i + "</td>";

  					Object.values(data[i]).forEach((value) =>{
						stringHold = stringHold + "<td>" + value + "</td>";
						totals[k] = totals[k] + value;
  					})
  						 	
  					stringHold = stringHold + "<td>" + totals[k] + "</td>" + "</tr>";
  					k = k + 1;
  				}

				resolve(stringHold);
  				
  			});
  			
  		})

        	replacePromise.then(data=>{
        	  	response = response.replace("replace",data);
        		response = response.replace("In Depth Analysis", "In Depth Analysis of " + energy + " energy");
        		response = response.replace("Consumption Snapshot", "Consumption Snapshot of "+energy + " energy");
        		response = response.replace("images/noimage.jpg", "images/"+energy+".jpg");
        		WriteHtml(res,response);
        	});
    }).catch((err) => {
        Write404Error(res);
    });
});

function ReadFile(filename) {
    return new Promise((resolve, reject) => {
        fs.readFile(filename, (err, data) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(data.toString());
            }
        });
    });
}

function Write404Error(res) {
    res.writeHead(404, {'Content-Type': 'text/plain'});
    res.write('Error: file not found');
    res.end();
}

function WriteHtml(res, html) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.write(html);
    res.end();
}


var server = app.listen(port);
