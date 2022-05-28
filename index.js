const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const express = require("express");
const app = express();
var cors = require("cors");
const verify = require("jsonwebtoken/verify");
require("dotenv").config();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ilere.mongodb.net/?retryWrites=true&w=majority`;

// Create a new MongoClient
const client = new MongoClient(uri);

async function run() {
  try {
    // Connect the client to the server
    await client.connect();
    // Establish and verify connection
    const reviewsCollection = client
      .db("baiku-manufacture")
      .collection("reviews");
    const productsCollection = client
      .db("baiku-manufacture")
      .collection("products");

    const ordersCollection = client
      .db("baiku-manufacture")
      .collection("orders");

    const usersCollection = client.db("baiku-manufacture").collection("users");

    // Veryfying Admin

    const verifyAdmin = async (req, res, next) => {
      const requester = req.decoded.email;
      const requesterAccount = await usersCollection.findOne({
        email: requester,
      });

      if (requesterAccount.role === "admin") {
        next();
      } else {
        res.status(403).send({ message: "forbidden" });
      }
    };

    // Veryfying JWT
    function verifyJWT(req, res, next) {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).send({ message: "UnAuthorized Access" });
      }

      const token = authHeader.split(" ")[1];
      jwt.verify(
        token,
        process.env.ACCESS_TOKEN_SECRET,
        function (err, decoded) {
          if (err) {
            return res.status(403).send({ message: "Forbidden Access" });
          }
          req.decoded = decoded;
          next();
        }
      );
    }

    // getting current user
    app.get("/user/:email", async (req, res) => {
      const email = req.params.email;
      const filter = { email };
      const result = await usersCollection.findOne(filter);
      console.log(result);
      res.send(result);
    });

    // Updating a user

    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          name: user.username,
          education: user.education,
          address: user.address,
          phone: user.phone,
        },
      };

      const result = await usersCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      console.log(result);
      res.send(result);
    });

    // get all users

    app.get("/users", verifyJWT, async (req, res) => {
      const users = await usersCollection.find().toArray();

      res.send(users);
    });

    // Get the Admin

    app.get("/admin/:email", async (req, res) => {
      const email = req.params.email;
      const user = await usersCollection.findOne({ email });
      const isAdmin = user.role === "admin";
      console.log(isAdmin);
      res.send(isAdmin);
    });

    // Making user a Admin

    app.put("/user/admin/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const requester = req.decoded.email;
      const requesterAccount = await usersCollection.findOne({
        email: requester,
      });
      if (requesterAccount.role === "admin") {
        const filter = { email };
        const updatedDoc = {
          $set: { role: "admin" },
        };
        const result = await usersCollection.updateOne(filter, updatedDoc);

        res.send(result);
      } else {
        return res.status(403).send({ message: "Forbidden Access" });
      }
    });

    // add a user

    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email };
      const options = { upsert: true };
      const updatedDoc = {
        $set: user,
      };
      const result = await usersCollection.updateOne(
        filter,
        updatedDoc,
        options
      );

      const token = jwt.sign({ email }, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ result, token });
    });

    // add a review
    app.post("/review", async (req, res) => {
      const review = req.body;
      const result = await reviewsCollection.insertOne(review);
      res.send(result);
    });
    // getting all the orders
    app.get("/orders", async (req, res) => {
      const query = {};
      const result = await ordersCollection.find(query).toArray();
      res.send(result);
    });

    // getting my orders by email

    app.get("/order", verifyJWT, async (req, res) => {
      const userEmail = req.query.email;
      console.log(userEmail);

      const decodedEmail = req.decoded.email;
      if (userEmail === decodedEmail) {
        const query = { userEmail: userEmail };
        const orders = await ordersCollection.find(query).toArray();

        return res.send(orders);
      } else {
        return res.status(403).send({ message: "Forbidden Access" });
      }
    });

    // add a single order
    app.post("/order", async (req, res) => {
      const order = req.body;
      const result = await ordersCollection.insertOne(order);
      res.send(result);
    });

    //  getting all client reviews
    app.get("/reviews", async (req, res) => {
      const query = {};
      const result = await reviewsCollection.find(query).toArray();
      res.send(result);
    });

    // Add A single Product
    app.post("/product", verifyJWT, verifyAdmin, async (req, res) => {
      const product = req.body;
      console.log(product);
      const result = await productsCollection.insertOne(product);
      res.send(result);
    });

    // getting all products

    app.get("/products", async (req, res) => {
      const query = {};
      const result = await productsCollection.find(query).toArray();
      res.send(result);
    });

    // Getting a single product by id for delete
    app.get("/product/:id", async (req, res) => {
      const id = req.params.id;

      const result = await productsCollection.deleteOne({ _id: ObjectId(id) });
      // console.log(result);
      res.send(result);
    });

    // getting a single product by id

    app.get("/purchase/:id", async (req, res) => {
      const id = req.params.id;

      const result = await productsCollection.findOne({ _id: ObjectId(id) });
      // console.log(result);
      res.send(result);
    });
    console.log("Connected successfully to server");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello From Baiku Server");
});

app.listen(port, () => {
  console.log(`Baiku app listening on port ${port}`);
});
