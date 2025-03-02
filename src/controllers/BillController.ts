import { Request, Response } from "express";
import pool from "../config/database";

// export const createBill = async (req: Request, res: Response) => {
//   const client = await pool.connect();

//   try {
//     await client.query("BEGIN");
//     const { items } = req.body;

//     // Find active bill (bill that has items with no bill_id)
//     const activeBillQuery = `
//       SELECT DISTINCT bi.bill_id
//       FROM bill_items bi
//       WHERE bi.bill_id IS NULL
//       LIMIT 1
//     `;
//     const activeBillResult = await client.query(activeBillQuery);

//     for (const item of items) {
//       const { stock_id, quantity } = item;

//       // Validate stock exists and get price
//       const stockQuery = `
//         SELECT unit_price, amount
//         FROM stocks
//         WHERE stock_id = $1
//       `;
//       const stockResult = await client.query(stockQuery, [stock_id]);

//       if (stockResult.rows.length === 0) {
//         throw new Error(`Stock with id ${stock_id} not found`);
//       }

//       const { unit_price, amount } = stockResult.rows[0];

//       // Check if enough stock
//       if (amount < quantity) {
//         throw new Error(
//           `Insufficient stock for id ${stock_id}. Available: ${amount}`
//         );
//       }

//       const subtotal = unit_price * quantity;

//       // Insert bill item with status 'pending'
//       await client.query(
//         `INSERT INTO bill_items (stock_id, quantity, subtotal, status)
//          VALUES ($1, $2, $3, 'pending')`,
//         [stock_id, quantity, subtotal]
//       );

//       // Update stock amount
//       await client.query(
//         `UPDATE stocks
//          SET amount = amount - $1
//          WHERE stock_id = $2`,
//         [quantity, stock_id]
//       );
//     }

//     await client.query("COMMIT");

//     // Get all current pending bill items
//     const currentItems = await client.query(`
//       SELECT
//         bi.bill_item_id,
//         bi.stock_id,
//         bi.quantity,
//         bi.subtotal,
//         s.unit_price,
//         d.name as drug_name
//       FROM bill_items bi
//       JOIN stocks s ON bi.stock_id = s.stock_id
//       JOIN drugs d ON s.drug_id = d.drug_id
//       WHERE bi.status = 'pending'
//       ORDER BY bi.bill_item_id ASC
//     `);

//     res.status(201).json({
//       message: "Bill items added successfully",
//       items: currentItems.rows,
//     });
//   } catch (error: any) {
//     await client.query("ROLLBACK");
//     res.status(500).json({
//       error: "Failed to add bill items",
//       details: error.message,
//     });
//   } finally {
//     client.release();
//   }
// }; //อันนี้ของจริงงงงงงงงงงง

export const createBill = async (req: Request, res: Response) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { items } = req.body;

    // Iterate over the items and insert into bill_items
    for (const item of items) {
      const { stock_id, quantity, price, customPrice, service } = item;

      let billItemPrice = price;
      let serviceName = service || null;

      // For service, we don't need stock_id
      if (service) {
        // This is a service, not a product
        billItemPrice = customPrice || price; // Use custom price if available
      } else {
        // For products, we use the stock_id to find the price and check stock
        if (stock_id) {
          const stockQuery = `
            SELECT unit_price, amount FROM stocks WHERE stock_id = $1
          `;
          const stockResult = await client.query(stockQuery, [stock_id]);

          if (stockResult.rows.length === 0) {
            throw new Error(`Stock with id ${stock_id} not found`);
          }

          const { unit_price, amount } = stockResult.rows[0];

          // Check if enough stock is available
          if (amount < quantity) {
            throw new Error(
              `Insufficient stock for id ${stock_id}. Available: ${amount}`
            );
          }

          billItemPrice = unit_price; // Use stock's price for product

          // Update the stock quantity
          await client.query(
            `UPDATE stocks SET amount = amount - $1 WHERE stock_id = $2`,
            [quantity, stock_id]
          );
        } else {
          throw new Error("Product stock ID is required.");
        }
      }

      // Insert the bill item into bill_items
      await client.query(
        `INSERT INTO bill_items (bill_id, stock_id, quantity, subtotal, service, custom_price)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          null, // Bill ID is null here, it will be updated later
          service ? null : stock_id, // Set stock_id as null for services
          quantity,
          billItemPrice * quantity,
          serviceName,
          customPrice,
        ]
      );
    }

    await client.query("COMMIT");

    res.status(201).json({
      message: "Bill items added successfully",
    });
  } catch (error: any) {
    await client.query("ROLLBACK");
    res.status(500).json({
      error: "Failed to add bill items",
      details: error.message,
    });
  } finally {
    client.release();
  }
};

// export const listBills = async (req: Request, res: Response): Promise<void> => {
//   const client = await pool.connect();

//   try {
//     const result = await client.query(`
//       SELECT
//         bi.bill_item_id,
//         bi.stock_id,
//         s.drug_id,
//         d.name AS drug_name,
//         bi.quantity,
//         bi.subtotal,
//         s.unit_price
//       FROM bill_items bi
//       JOIN stocks s ON bi.stock_id = s.stock_id
//       JOIN drugs d ON s.drug_id = d.drug_id
//       WHERE bi.status = 'pending'
//       ORDER BY bi.bill_item_id ASC
//     `);

//     res.status(200).json(result.rows); // ส่งกลับแค่ items ที่ยังไม่ได้ยืนยัน
//   } catch (error: any) {
//     console.error("Error fetching bill items:", error);
//     res.status(500).json({
//       error: "Failed to fetch bill items",
//       message: error.message,
//     });
//   } finally {
//     client.release();
//   }
// };

export const listBills = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();

  try {
    const result = await client.query(`
      SELECT 
        bi.bill_item_id,
        bi.stock_id,
        bi.quantity,
        bi.subtotal,
        s.unit_price,
        d.name AS drug_name,
        bi.service,
        bi.custom_price,
        CASE 
          WHEN bi.service IS NOT NULL THEN bi.service
          ELSE d.name
        END AS display_name
      FROM bill_items bi
      LEFT JOIN stocks s ON bi.stock_id = s.stock_id
      LEFT JOIN drugs d ON s.drug_id = d.drug_id
      WHERE bi.status = 'pending'
      ORDER BY bi.bill_item_id ASC
    `);

    // Process result to include display name for service
    const bills = result.rows.map((row) => {
      return {
        ...row,
        drug_name: row.display_name, // Either drug name or service name
      };
    });

    res.status(200).json(bills);
  } catch (error: any) {
    console.error("Error fetching bill items:", error);
    res.status(500).json({
      error: "Failed to fetch bill items",
      message: error.message,
    });
  } finally {
    client.release();
  }
};

// export const removeBillItem = async (
//   req: Request,
//   res: Response
// ): Promise<void> => {
//   const client = await pool.connect();
//   const billItemId = parseInt(req.params.id, 10);

//   if (isNaN(billItemId)) {
//     res.status(400).json({ error: "Invalid bill_item_id" });
//     return;
//   }

//   try {
//     await client.query("BEGIN");

//     const billItemResult = await client.query(
//       "SELECT stock_id, quantity FROM bill_items WHERE bill_item_id = $1",
//       [billItemId]
//     );

//     if (billItemResult.rows.length === 0) {
//       throw new Error(`Bill item with ID ${billItemId} not found`);
//     }

//     const { stock_id, quantity } = billItemResult.rows[0];

//     await client.query("DELETE FROM bill_items WHERE bill_item_id = $1", [
//       billItemId,
//     ]);

//     await client.query(
//       "UPDATE stocks SET amount = amount + $1 WHERE stock_id = $2",
//       [quantity, stock_id]
//     );

//     await client.query("COMMIT");

//     res
//       .status(200)
//       .json({ message: `Bill item ${billItemId} removed and stock updated` });
//   } catch (error: any) {
//     await client.query("ROLLBACK");
//     console.error("Error removing bill item:", error);
//     res.status(500).json({
//       error: "Failed to remove bill item",
//       message: error.message,
//     });
//   } finally {
//     client.release();
//   }
// };

export const removeBillItem = async (
  req: Request,
  res: Response
): Promise<void> => {
  const client = await pool.connect();
  const billItemId = parseInt(req.params.id, 10);

  if (isNaN(billItemId)) {
    res.status(400).json({ error: "Invalid bill_item_id" });
    return;
  }

  try {
    await client.query("BEGIN");

    const billItemResult = await client.query(
      "SELECT stock_id, quantity FROM bill_items WHERE bill_item_id = $1",
      [billItemId]
    );

    if (billItemResult.rows.length === 0) {
      throw new Error(`Bill item with ID ${billItemId} not found`);
    }

    const { stock_id, quantity } = billItemResult.rows[0];

    await client.query("DELETE FROM bill_items WHERE bill_item_id = $1", [
      billItemId,
    ]);

    await client.query(
      "UPDATE stocks SET amount = amount + $1 WHERE stock_id = $2",
      [quantity, stock_id]
    );

    await client.query("COMMIT");

    res
      .status(200)
      .json({ message: `Bill item ${billItemId} removed and stock updated` });
  } catch (error: any) {
    await client.query("ROLLBACK");
    console.error("Error removing bill item:", error);
    res.status(500).json({
      error: "Failed to remove bill item",
      message: error.message,
    });
  } finally {
    client.release();
  }
};

// export const confirm = async (req: Request, res: Response): Promise<void> => {
//   const client = await pool.connect();

//   try {
//     await client.query("BEGIN");

//     const { final_amount, discount } = req.body;

//     // ดึงข้อมูลรายการสินค้าในบิล
//     const billItemsResult = await client.query(`
//       SELECT
//         bi.bill_item_id,
//         bi.stock_id,
//         bi.quantity,
//         bi.subtotal,
//         s.unit_price,
//         d.name AS drug_name
//       FROM bill_items bi
//       JOIN stocks s ON bi.stock_id = s.stock_id
//       JOIN drugs d ON s.drug_id = d.drug_id
//       WHERE bi.status = 'pending'
//       ORDER BY bi.bill_item_id ASC
//     `);

//     if (billItemsResult.rows.length === 0) {
//       throw new Error("No pending bill items found to confirm");
//     }

//     const billItems = billItemsResult.rows;

//     // คำนวณยอดรวมก่อนหักส่วนลด (รวมค่า subtotal ของทุกบิล)
//     const totalAmount = billItems.reduce(
//       (sum, item) => sum + parseFloat(item.subtotal),
//       0
//     );

//     // คำนวณยอดเงินหลังหักส่วนลดจาก totalAmount
//     const discountedAmount = totalAmount - (totalAmount * discount) / 100;

//     // ตรวจสอบว่า discount ไม่เกิน totalAmount
//     if (discountedAmount < 0) {
//       throw new Error("Discounted amount cannot be negative");
//     }

//     // Insert the bill into the bills table with the discount applied
//     const billResult = await client.query(
//       `INSERT INTO bills (total_amount, discount, created_at)
//        VALUES ($1, $2, NOW())
//        RETURNING bill_id`,
//       [discountedAmount, discount] // ใช้ discountedAmount ที่คำนวณแล้ว
//     );

//     const newBillId = billResult.rows[0].bill_id;

//     // Update the bill items with the new bill_id and set their status to 'confirmed'
//     await client.query(
//       `UPDATE bill_items
//        SET bill_id = $1, status = 'confirmed'
//        WHERE status = 'pending'`,
//       [newBillId]
//     );

//     await client.query("COMMIT");

//     const completeBill = await client.query(
//       `SELECT
//         b.bill_id,
//         b.total_amount,
//         b.discount,
//         b.created_at,
//         json_agg(
//           json_build_object(
//             'bill_item_id', bi.bill_item_id,
//             'stock_id', bi.stock_id,
//             'quantity', bi.quantity,
//             'subtotal', bi.subtotal,
//             'unit_price', s.unit_price,
//             'drug_name', d.name
//           ) ORDER BY bi.bill_item_id ASC
//         ) AS items
//       FROM bills b
//       JOIN bill_items bi ON b.bill_id = bi.bill_id
//       JOIN stocks s ON bi.stock_id = s.stock_id
//       JOIN drugs d ON s.drug_id = d.drug_id
//       WHERE b.bill_id = $1
//       GROUP BY b.bill_id, b.total_amount, b.discount, b.created_at`,
//       [newBillId]
//     );

//     res.status(201).json({
//       message: "Bill confirmed successfully",
//       bill: completeBill.rows[0],
//     });
//   } catch (error: any) {
//     await client.query("ROLLBACK");
//     console.error("Error confirming bill:", error);
//     res.status(500).json({
//       error: "Failed to confirm bill",
//       message: error.message,
//     });
//   } finally {
//     client.release();
//   }
// };

export const confirm = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { final_amount, discount } = req.body;

    const billItemsResult = await client.query(`
      SELECT
        bi.bill_item_id,
        bi.stock_id,
        bi.quantity,
        bi.subtotal,
        s.unit_price,
        d.name AS drug_name,
        bi.service,
        bi.custom_price
      FROM bill_items bi
      LEFT JOIN stocks s ON bi.stock_id = s.stock_id
      LEFT JOIN drugs d ON s.drug_id = d.drug_id
      WHERE bi.status = 'pending'
      ORDER BY bi.bill_item_id ASC
    `);

    if (billItemsResult.rows.length === 0) {
      throw new Error("No pending bill items found to confirm");
    }

    const billItems = billItemsResult.rows;

    const totalAmount = billItems.reduce(
      (sum, item) => sum + parseFloat(item.subtotal),
      0
    );

    const discountedAmount = totalAmount - (totalAmount * discount) / 100;

    if (discountedAmount < 0) {
      throw new Error("Discounted amount cannot be negative");
    }

    const currentDate = new Date();

    const billResult = await client.query(
      `INSERT INTO bills (total_amount, discount, created_at)
       VALUES ($1, $2, $3) RETURNING bill_id`,
      [discountedAmount, discount, currentDate]
    );

    const newBillId = billResult.rows[0].bill_id;

    await client.query(
      `UPDATE bill_items
       SET bill_id = $1, status = 'confirmed'
       WHERE status = 'pending'`,
      [newBillId]
    );

    await client.query("COMMIT");

    const completeBill = await client.query(
      `SELECT
        b.bill_id,
        b.total_amount,
        b.discount,
        b.created_at,
        json_agg(
          json_build_object(
            'bill_item_id', bi.bill_item_id,
            'stock_id', bi.stock_id,
            'quantity', bi.quantity,
            'subtotal', bi.subtotal,
            'unit_price', s.unit_price,
            'drug_name', d.name,
            'service', bi.service,
            'custom_price', bi.custom_price
          ) ORDER BY bi.bill_item_id ASC
        ) AS items
      FROM bills b
      LEFT JOIN bill_items bi ON b.bill_id = bi.bill_id
      LEFT JOIN stocks s ON bi.stock_id = s.stock_id
      LEFT JOIN drugs d ON s.drug_id = d.drug_id
      WHERE b.bill_id = $1
      GROUP BY b.bill_id, b.total_amount, b.discount, b.created_at`,
      [newBillId]
    );

    res.status(201).json({
      message: "Bill confirmed successfully",
      bill: completeBill.rows[0],
    });
  } catch (error: any) {
    await client.query("ROLLBACK");
    console.error("Error confirming bill:", error);
    res.status(500).json({
      error: "Failed to confirm bill",
      message: error.message,
    });
  } finally {
    client.release();
  }
};

export const history = async (req: Request, res: Response) => {
  const client = await pool.connect();
  const { page = 1, searchQuery = "" } = req.query;

  const itemsPerPage = 10;
  const offset = (Number(page) - 1) * itemsPerPage;

  try {
    const searchString = Array.isArray(searchQuery)
      ? searchQuery.join(" ")
      : String(searchQuery);

    const historyQuery = `
      SELECT 
        b.bill_id,
        b.customer_name,
        b.total_amount,
        b.created_at,
        COUNT(bi.bill_item_id) AS item_count
      FROM bills b
      LEFT JOIN bill_items bi ON b.bill_id = bi.bill_id
      WHERE LOWER(b.bill_id::text) LIKE $1
        OR LOWER(b.created_at::text) LIKE $2
      GROUP BY b.bill_id
      ORDER BY b.created_at DESC
      LIMIT $3 OFFSET $4
    `;

    const searchPattern = `%${searchString.toLowerCase()}%`;

    const historyResult = await client.query(historyQuery, [
      searchPattern,
      searchPattern,
      itemsPerPage,
      offset,
    ]);

    const countQuery =
      "SELECT COUNT(*) FROM bills WHERE LOWER(bill_id::text) LIKE $1 OR LOWER(created_at::text) LIKE $2";
    const countResult = await client.query(countQuery, [
      searchPattern,
      searchPattern,
    ]);

    const totalRows = parseInt(countResult.rows[0].count, 10);
    const totalPage = Math.ceil(totalRows / itemsPerPage);

    res.status(200).json({
      bills: historyResult.rows,
      totalRows,
      totalPage,
    });
  } catch (error: any) {
    res
      .status(500)
      .json({ error: "Failed to fetch bill history", details: error.message });
  } finally {
    client.release();
  }
};

// export const dashboard = async (req: Request, res: Response) => {
//   const client = await pool.connect();
//   const { year } = req.params;

//   try {
//     await client.query("BEGIN");

//     const dashboardQuery = `
//       SELECT
//         EXTRACT(MONTH FROM created_at) AS month,
//         SUM(total_amount) AS total_sales
//       FROM bills
//       WHERE EXTRACT(YEAR FROM created_at) = $1
//       GROUP BY month
//       ORDER BY month;
//     `;
//     const dashboardResult = await client.query(dashboardQuery, [year]);

//     const expensesQuery = `
//       SELECT
//         EXTRACT(MONTH FROM datetime) AS month,
//         SUM(totalprice) AS total_expenses
//       FROM expense
//       WHERE EXTRACT(YEAR FROM datetime) = $1
//       GROUP BY month
//       ORDER BY month;
//     `;
//     const expensesResult = await client.query(expensesQuery, [year]);

//     const monthlyData = dashboardResult.rows.map((row) => {
//       const expenseData = expensesResult.rows.find(
//         (expense) => expense.month === row.month
//       );
//       return {
//         month: row.month,
//         income: row.total_sales || 0,
//         expense: expenseData ? expenseData.total_expenses : 0,
//       };
//     });

//     const totalSales = monthlyData.reduce(
//       (total, data) => total + parseFloat(data.income || "0"),
//       0
//     );

//     const totalExpenses = monthlyData.reduce(
//       (total, data) => total + parseFloat(data.expense || "0"),
//       0
//     );

//     const netProfit = totalSales - totalExpenses;

//     // Get the total sales, total expenses, and net profit for all years
//     const totalSalesAllYearsQuery = `
//       SELECT
//         SUM(total_amount) AS total_sales_all_years
//       FROM bills;
//     `;
//     const totalSalesAllYearsResult = await client.query(
//       totalSalesAllYearsQuery
//     );

//     const totalExpensesAllYearsQuery = `
//       SELECT
//         SUM(totalprice) AS total_expenses_all_years
//       FROM expense;
//     `;
//     const totalExpensesAllYearsResult = await client.query(
//       totalExpensesAllYearsQuery
//     );

//     const totalSalesAllYears =
//       totalSalesAllYearsResult.rows[0].total_sales_all_years || 0;
//     const totalExpensesAllYears =
//       totalExpensesAllYearsResult.rows[0].total_expenses_all_years || 0;
//     const netProfitAllYears = totalSalesAllYears - totalExpensesAllYears;

//     const finalMonthlyData = monthlyData.filter((data) => data.expense !== 0);

//     res.status(200).json({
//       monthlyData: finalMonthlyData,
//       totalSales: parseFloat(totalSales.toString()),
//       totalExpenses: parseFloat(totalExpenses.toString()),
//       netProfit: parseFloat(netProfit.toString()),
//       totalSalesAllYears: parseFloat(totalSalesAllYears.toString()),
//       totalExpensesAllYears: parseFloat(totalExpensesAllYears.toString()),
//       netProfitAllYears: parseFloat(netProfitAllYears.toString()),
//     });

//     await client.query("COMMIT");
//   } catch (error: any) {
//     await client.query("ROLLBACK");
//     res.status(500).json({
//       error: "Failed to fetch dashboard data",
//       details: error.message,
//     });
//   } finally {
//     client.release();
//   }
// };//ssssss

export const dashboard = async (req: Request, res: Response) => {
  const client = await pool.connect();
  const { year } = req.params;

  try {
    await client.query("BEGIN");

    // คิวรีสำหรับดึงยอดขาย (sales) ของแต่ละเดือนในปีที่ระบุ
    const dashboardQuery = `
      SELECT
        EXTRACT(MONTH FROM created_at) AS month,
        SUM(total_amount) AS total_sales
      FROM bills
      WHERE EXTRACT(YEAR FROM created_at) = $1
      GROUP BY month
      ORDER BY month;
    `;
    const dashboardResult = await client.query(dashboardQuery, [year]);

    // คิวรีสำหรับดึงค่าใช้จ่าย (expenses) ของแต่ละเดือนในปีที่ระบุ
    const expensesQuery = `
      SELECT
        EXTRACT(MONTH FROM datetime) AS month,
        SUM(totalprice) AS total_expenses
      FROM expense
      WHERE EXTRACT(YEAR FROM datetime) = $1
      GROUP BY month
      ORDER BY month;
    `;
    const expensesResult = await client.query(expensesQuery, [year]);

    // สร้างข้อมูลที่รวมยอดขายและค่าใช้จ่ายของแต่ละเดือน
    const monthlyData = dashboardResult.rows.map((row) => {
      const expenseData = expensesResult.rows.find(
        (expense) => expense.month === row.month
      );
      return {
        month: row.month,
        income: row.total_sales || 0,
        expense: expenseData ? expenseData.total_expenses : 0,
      };
    });

    // คำนวณยอดขายรวม (totalSales)
    const totalSales = monthlyData.reduce(
      (total, data) => total + parseFloat(data.income || "0"),
      0
    );

    // คำนวณค่าใช้จ่ายรวม (totalExpenses)
    const totalExpenses = monthlyData.reduce(
      (total, data) => total + parseFloat(data.expense || "0"),
      0
    );

    // คำนวณกำไรสุทธิ (netProfit)
    const netProfit = totalSales - totalExpenses;

    // คิวรีสำหรับดึงยอดขายทั้งหมด (total sales) สำหรับทุกปี
    const totalSalesAllYearsQuery = `
      SELECT
        SUM(total_amount) AS total_sales_all_years
      FROM bills;
    `;
    const totalSalesAllYearsResult = await client.query(
      totalSalesAllYearsQuery
    );

    // คิวรีสำหรับดึงค่าใช้จ่ายทั้งหมด (total expenses) สำหรับทุกปี
    const totalExpensesAllYearsQuery = `
      SELECT
        SUM(totalprice) AS total_expenses_all_years
      FROM expense;
    `;
    const totalExpensesAllYearsResult = await client.query(
      totalExpensesAllYearsQuery
    );

    // สรุปยอดรวมทั้งหมดสำหรับทุกปี
    const totalSalesAllYears =
      totalSalesAllYearsResult.rows[0].total_sales_all_years || 0;
    const totalExpensesAllYears =
      totalExpensesAllYearsResult.rows[0].total_expenses_all_years || 0;
    const netProfitAllYears = totalSalesAllYears - totalExpensesAllYears;

    // แสดงข้อมูลทุกเดือน (ไม่กรอง)
    const finalMonthlyData = monthlyData; // ใช้ข้อมูลทั้งหมด ไม่กรองเดือนที่ค่าใช้จ่ายเป็น 0

    // ส่งข้อมูลกลับไปยัง client
    res.status(200).json({
      monthlyData: finalMonthlyData,
      totalSales: parseFloat(totalSales.toString()),
      totalExpenses: parseFloat(totalExpenses.toString()),
      netProfit: parseFloat(netProfit.toString()),
      totalSalesAllYears: parseFloat(totalSalesAllYears.toString()),
      totalExpensesAllYears: parseFloat(totalExpensesAllYears.toString()),
      netProfitAllYears: parseFloat(netProfitAllYears.toString()),
    });

    await client.query("COMMIT");
  } catch (error: any) {
    await client.query("ROLLBACK");
    res.status(500).json({
      error: "Failed to fetch dashboard data",
      details: error.message,
    });
  } finally {
    client.release();
  }
};

// export const getBillInfo = async (
//   req: Request,
//   res: Response
// ): Promise<void> => {
//   const client = await pool.connect();
//   const { bill_id } = req.params;

//   // Validate bill_id (check if it's a valid integer)
//   if (!bill_id || isNaN(Number(bill_id))) {
//     res.status(400).json({ error: "Invalid or missing bill_id" });
//     return; // Ensure no further code execution
//   }

//   try {
//     // Fetch bill and treatment details without customer_name, using stock_id instead of bill_item_id
//     const billQuery = `
//       SELECT
//         b.bill_id,
//         b.total_amount,
//         b.discount,
//         b.created_at,
//         json_agg(
//           json_build_object(
//             'stock_id', bi.stock_id,
//             'drug_name', d.name,
//             'quantity', bi.quantity,
//             'unit_price', s.unit_price,
//             'subtotal', bi.subtotal
//           ) ORDER BY bi.stock_id ASC
//         ) AS treatments
//       FROM bills b
//       JOIN bill_items bi ON b.bill_id = bi.bill_id
//       JOIN stocks s ON bi.stock_id = s.stock_id
//       JOIN drugs d ON s.drug_id = d.drug_id
//       WHERE b.bill_id = $1
//       GROUP BY b.bill_id, b.total_amount, b.created_at;
//     `;

//     const billResult = await client.query(billQuery, [bill_id]);

//     if (billResult.rows.length === 0) {
//       res.status(404).json({ error: "Bill not found" });
//       return;
//     }

//     const billData = billResult.rows[0];
//     res.status(200).json(billData);
//   } catch (error: any) {
//     console.error("Error fetching bill info:", error);
//     res
//       .status(500)
//       .json({ error: "Failed to fetch bill info", message: error.message });
//   } finally {
//     client.release();
//   }
// };

export const getBillInfo = async (
  req: Request,
  res: Response
): Promise<void> => {
  const client = await pool.connect();
  const { bill_id } = req.params;

  // Validate bill_id (check if it's a valid integer)
  if (!bill_id || isNaN(Number(bill_id))) {
    res.status(400).json({ error: "Invalid or missing bill_id" });
    return; // Ensure no further code execution
  }

  try {
    // Fetch bill and treatment details without customer_name, using stock_id instead of bill_item_id
    const billQuery = `
      SELECT 
        b.bill_id, 
        b.total_amount, 
        b.discount,
        b.created_at, 
        json_agg(
          json_build_object(
            'stock_id', bi.stock_id,      
            'drug_name', 
              CASE
                WHEN bi.service IS NOT NULL THEN bi.service
                ELSE d.name
              END,
            'quantity', bi.quantity,
            'unit_price', s.unit_price,
            'subtotal', bi.subtotal
          ) ORDER BY bi.stock_id ASC    
        ) AS treatments
      FROM bills b
      JOIN bill_items bi ON b.bill_id = bi.bill_id
      LEFT JOIN stocks s ON bi.stock_id = s.stock_id
      LEFT JOIN drugs d ON s.drug_id = d.drug_id
      WHERE b.bill_id = $1
      GROUP BY b.bill_id, b.total_amount, b.created_at;
    `;

    const billResult = await client.query(billQuery, [bill_id]);

    if (billResult.rows.length === 0) {
      res.status(404).json({ error: "Bill not found" });
      return;
    }

    const billData = billResult.rows[0];
    res.status(200).json(billData);
  } catch (error: any) {
    console.error("Error fetching bill info:", error);
    res
      .status(500)
      .json({ error: "Failed to fetch bill info", message: error.message });
  } finally {
    client.release();
  }
};
