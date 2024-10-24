import express from "express";
import path from 'path';
import { fileURLToPath } from 'url';
import fs from "fs"
import methodOverride from 'method-override';
import multer from 'multer';
import bcrypt from "bcrypt"





// app setings
const app = express();
const port = 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);




// Middleware
app.set('view engine', 'ejs');

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Middleware to support PATCH via form POST
app.use(methodOverride('_method'));


const dataPath = path.join(__dirname, "data.json")
let cafes = [];
let blogs = [];

// city images
const cities = [
  { name: 'milano', image: '/images/cities/milan.jpg' },
  { name: 'paris', image: '/images/cities/paris.jpg' },
  { name: 'tel-aviv', image: '/images/cities/tel-aviv.jpg' },
  { name: 'london', image: '/images/cities/london.jpg' },
  { name: 'new-york', image: '/images/cities/new-york.jpg' },
  { name: 'tokyo', image: '/images/cities/tokyo.jpg' },

];




// load the data from the json

try {
  const data = fs.readFileSync(dataPath, "utf8");
  const parsedData = JSON.parse(data);
  cafes = parsedData.cafes;
  blogs = parsedData.blogs;
  
} catch (err) {
  console.error("Failed to read data file", err);
}


const cafesByCity = cafes.reduce((acc, cafe) => {
  const city = cafe.city.toLowerCase();
  if (!acc[city]) acc[city] = [];
  acc[city].push(cafe);
  return acc;
}, {});




// IMAGE STORAGE
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
      cb(null, 'public/uploads'); // Set where to save uploaded files
  },
  filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Initialize Multer with the storage options
const upload = multer({ storage });




/////////////////////// ROUTINGS //////////////////////////



// Homepage route
app.get('/', (req, res) => {
  res.render('index');
});

// About page route
app.get('/about', (req, res) => {
  res.render('about');
});

// Contact page route
app.get('/contact', (req, res) => {
  res.render('contact');
});


app.get("/privacy", (req, res) => {
  res.render('privacy.ejs');
});


// Show Blogs page
app.get('/blogs', (req, res) => {
  res.render('blogs',{blogs});
});


// Show single post 
app.get("/blogs/:id", (req, res) => {
  const blogId = parseInt(req.params.id);
  const blog = blogs.find(b => b.id === blogId);
  if (blog) {
    res.render('post', {blog});
  } else {
    res.status(404).send("post not found")
  }
});


// log-in page
app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login', (req, res) => {
res.render('login')
})


// register page 
app.get('/register', (req, res) => {
  res.render('register')
})

app.post("/register",async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10)
    users.push({
      id: Date.now().toString(),
      name: req.body.name,
      email: req.body.email,
      password: hashedPassword
    })
    res.redirect('/login')
  } catch { 
    res.redirect('/register')
  }
  console.log(users)
})


// get the cafes of a city
app.get('/city/:city', (req, res) => {
  const cityParam = req.params.city.toLowerCase();
  const cafesInCity = cafes.filter(cafe => cafe.city.toLowerCase() === cityParam);

  
    const cityData = cities.find(city => city.name.toLowerCase() === cityParam);
    const cityImage = cityData ? cityData.image : '/images/default-city.jpg'; // Fallback image
    res.render('cafes-list', { cafes: cafesInCity, city: cityParam, cityImage });
 
});



// Show the cafe details 
app.get('/cafe-details/:id', (req, res) => {
  const cafeId = parseInt(req.params.id)
  const cafe = cafes.find(c => c.id === cafeId);
  if (cafe) {
    res.render("cafe-details", {cafe});
  } else {
    res.status(404).send("cafe not found")
  }
});



// add cafe page
app.get('/add-cafe', (req, res) => {
  res.render('add-cafe');
});



// add cafe page post-route
app.post('/add-cafe', upload.single('image'), (req, res) => {
  const newCafe = {
      id: cafes.length ? cafes[cafes.length - 1].id + 1 : 1,
      name: req.body.name,
      location: req.body.location,
      rating: req.body.rating,
      image: req.file ? `/uploads/${req.file.filename}` : '', // Save the uploaded image path
      "opening Hours": req.body.openingHours,
      contact: req.body.contact,
      website: req.body.website,
      "google-map": req.body.googleMap,
      review: req.body.review,
      city: req.body.city.toLowerCase()
  };

  // Add to cafes list and save to JSON file
  cafes.push(newCafe);
  fs.writeFileSync(dataPath, JSON.stringify({ cafes, blogs }, null, 2), 'utf-8');
  res.redirect(`/city/${newCafe.city}`);


  // ERROR HANDLING
  try {
    fs.writeFileSync(dataPath, JSON.stringify({ cafes, blogs }, null, 2), 'utf-8');
    res.redirect(`/city/${newCafe.city}`);
} catch (err) {
    console.error("Failed to write to data file", err);
    res.status(500).send("Failed to add cafe");
}
});



//edit cafe GET 
app.get('/edit-cafe/:id', (req, res) => {
  const cafeId = parseInt(req.params.id);
  const cafe = cafes.find(c => c.id === cafeId);
  if (cafe) {
      res.render('edit-cafe', { cafe });
  } else {
      res.status(404).send("Cafe not found");
  }
});



// PATCH route to handle editing a cafe with image upload
app.patch('/edit-cafe/:id', upload.single('image'), (req, res) => {
  const cafeId = parseInt(req.params.id);
  const index = cafes.findIndex(c => c.id === cafeId);
  
  if (index !== -1) {
      // Update cafe details, including image if a new file is uploaded
      cafes[index] = {
          ...cafes[index],
          name: req.body.name,
          location: req.body.location,
          rating: req.body.rating,
          image: req.file ? `/uploads/${req.file.filename}` : cafes[index].image, // Keep old image if no new upload
          "opening Hours": req.body.openingHours,
          contact: req.body.contact,
          website: req.body.website,
          "google-map": req.body.googleMap,
          review: req.body.review,
          city: req.body.city.toLowerCase()
      };

      // Save updated cafes list to the JSON file
      fs.writeFileSync(dataPath, JSON.stringify({ cafes, blogs }, null, 2), 'utf-8');
      res.redirect(`/cafe-details/${cafeId}`);
  } else {
      res.status(404).send("Cafe not found");
  }
});

// Handle deleting a cafe using DELETE method
app.delete('/delete-cafe/:id', (req, res) => {
  const cafeId = parseInt(req.params.id);
  cafes = cafes.filter(c => c.id !== cafeId);

  // Save updated cafes list to the JSON file
  try {
      fs.writeFileSync(dataPath, JSON.stringify({ cafes, blogs }, null, 2), 'utf-8');
      res.redirect('/'); // Redirect to home or city page
  } catch (err) {
      console.error("Failed to write to data file", err);
      res.status(500).send("Failed to delete cafe");
  }
});



app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
