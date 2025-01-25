import express, { Request, Response } from "express";
import {
  getAllStock,
  addStock,
  updateStock,
  getStockByDrugId,
} from "../controllers/StockController";

import {
  getAllDrugs,
  addDrug,
  getDrugById,
  updateDrug,
  deleteDrug,
} from "../controllers/DrugController";

import { createBill, getBillById } from "../controllers/BillController";

const router = express.Router();

router.get("/stocks", getAllStock);
router.post("/stocks", addStock);
router.put("/stocks/:id", updateStock);
router.get("/stocks/drug/:drug_id", getStockByDrugId);

router.get("/drugs", getAllDrugs);
router.get("/drugs/:id", getDrugById);
router.post("/drugs", addDrug);
router.put("/drugs/:id", updateDrug);
router.delete("/drugs/:id", deleteDrug);

// Bill routes
router.post("/bills", createBill);
router.get("/bills/:bill_id", getBillById);

export default router;
