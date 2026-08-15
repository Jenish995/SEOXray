const express = require("express");
const { scanController } = require("../controller/scanController");

const router = express.Router();

router.post("/scan", scanController);

module.exports = router;
