const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

// =================================================================

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.fmvmv30.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    // =======================all collections ==========================================
    const userCollection = client.db("gadgetDb").collection("users");
    const featuredProductsCollection = client
      .db("gadgetDb")
      .collection("featuredProducts");
    const reviewCollection = client.db("gadgetDb").collection("reviews");
    const trendingProductsCollection = client
      .db("gadgetDb")
      .collection("trendingProducts");

    const userAddedCollection = client
      .db("gadgetDb")
      .collection("userAddedProduct");
    // ============================Middlewares=====================================
    const verifyToken = (req, res, next) => {
      console.log("inside verify token", req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "forbidden-access" });
      }
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "forbidden-access" });
        }
        req.decoded = decoded;
        next();
      });
    };

    // use verify admin after verify token
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === "admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };
    // ======================JWT related API===========================================
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });
    // =========================Products related api========================================
    app.get("/featuredProducts", async (req, res) => {
      const result = await featuredProductsCollection.find().toArray();
      res.send(result);
    });
    app.get("/featuredProducts/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await featuredProductsCollection.findOne(query);
      res.send(result);
    });
    app.patch("/featuredProducts/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateFeaturedProduct = req.body;
      // console.log(updatedBooking);

      const updateDoc = {
        $set: {
          ProductName: updateFeaturedProduct.name,
          ProductImage: updateFeaturedProduct.image,
          ProductTags: updateFeaturedProduct.tags,
          ProductCardId: updateFeaturedProduct._id,
          votes: updateFeaturedProduct.votesUp,
        },
      };
      const result = await featuredProductsCollection.updateOne(
        filter,
        updateDoc
      );
      res.send(result);
    });
    // app.post("/trendingProducts", async (req, res) => {
    //   const item = req.body;
    //   const result = await trendingProductsCollection.insertOne(item);
    //   res.send(result);
    // });
    app.post("/reviews", async (req, res) => {
      const item = req.body;
      const result = await reviewCollection.insertOne(item);
      res.send(result);
    });
    app.get("/reviews", async (req, res) => {
      const result = await reviewCollection.find().toArray();
      res.send(result);
    });
    // =======================user related api==========================================
    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "User already exists", insertedId: null });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });
    app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
      // console.log(req.headers);
      const result = await userCollection.find().toArray();
      res.send(result);
    });
    app.get("/users/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "unauthorized access" });
      }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role == "admin";
      }
      res.send({ admin });
    });
    app.delete("/user/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });
    // ---for admin role ---
    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    });
    // ---for moderator role ---
    app.patch("/users/moderator/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "moderator",
        },
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    });
    // =================================================================
    app.post("/userAddedProduct", async (req, res) => {
      const item = req.body;
      const result = await userAddedCollection.insertOne(item);
      res.send(result);
    });
    app.get("/userAddedProduct", async (req, res) => {
      const email = req.query.email;
      const query = { ProductOwnerEmail: email };
      // console.log(email);
      // let query = {};
      // if (req.query.email) {
      //   query = { ProductOwnerEmail: email };
      // }
      // console.log(query);
      const result = await userAddedCollection.find(query).toArray();
      console.log(result);
      res.send(result);
    });

    app.get("/userAddedProduct/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userAddedCollection.findOne(query);
      res.send(result);
    });
    app.patch("/userUpdateProduct/:id", async (req, res) => {
      const item = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          ProductName: item.ProductName,
          ProductPhoto: item.ProductPhoto,
          ProductDescription: item.ProductDescription,
          ProductTag: item.ProductTag,
          ProductExternalLink: item.ProductExternalLink,
        },
      };
      const result = await userAddedCollection.updateOne(filter, updateDoc);
      res.send(result);
    });
    app.delete("/userDeleteProduct/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userAddedCollection.deleteOne(query);
      res.send(result);
    });
    // =================================================================
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

// =================================================================
app.get("/", (req, res) => {
  res.send("Gadget server is running");
});

app.listen(port, () => {
  console.log(`Gadget server is sitting on port ${port}`);
});
