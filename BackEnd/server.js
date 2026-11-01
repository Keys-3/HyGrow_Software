import "dotenv/config";
import express from "express";
import cors from "cors";

import diseaseRoutes from "./routes/disease.js";
import growthRoutes from "./routes/growthPrediction.js";
import emailRoutes from "./routes/email.js";
import paymentRoutes from "./routes/payment.js";
import iotRoutes from "./routes/iot.js";
import { startUdpListener } from "./services/udpDiscovery.js";

const app = express();

app.use(cors());

// Parse JSON FIRST
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({
  extended: true,
  limit: "50mb",
}));

// THEN register routes
app.use("/growth", growthRoutes);
app.use("/api", diseaseRoutes);
app.use("/api/email", emailRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/iot", iotRoutes);

app.get("/", (_, res) => {
  res.json({
    success: true,
    message: "HyGrow Backend Running",
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  // Start UDP discovery service on port 39400
  startUdpListener();
});