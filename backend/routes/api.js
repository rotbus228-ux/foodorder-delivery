const express    = require('express');
const router     = express.Router();
const adminAuth  = require('../middleware/adminAuth');
const delivery   = require('../controllers/deliveryController');
// getOrdersByPhone destructured separately for clarity
const menuController     = require('../controllers/menuController');
const settingsController = require('../controllers/settingsController');
const { upload, uploadMenuImage, uploadQrImage } = require('../controllers/uploadController');

// ─── Upload ───────────────────────────────────────────────────────────────────
router.post('/upload/menu-image', adminAuth, upload.single('file'), uploadMenuImage);
router.post('/upload/qr-image',   adminAuth, upload.single('file'), uploadQrImage);

// ─── Settings ─────────────────────────────────────────────────────────────────
router.get('/settings',      settingsController.getSettings);
router.put('/settings/:key', adminAuth, settingsController.setSetting);

// ─── Categories ───────────────────────────────────────────────────────────────
router.get   ('/categories',     menuController.getAllCategories);
router.post  ('/categories',     adminAuth, menuController.createCategory);
router.delete('/categories/:id', adminAuth, menuController.deleteCategory);

// ─── Menus ────────────────────────────────────────────────────────────────────
router.get   ('/menus',                  menuController.getAllMenus);
router.post  ('/menus',                  adminAuth, menuController.createMenu);
router.put   ('/menus/:id/availability', adminAuth, menuController.updateMenuAvailability);
router.put   ('/menus/:id/options',      adminAuth, menuController.setMenuOptions);
router.put   ('/menus/:id',              adminAuth, menuController.updateMenu);
router.delete('/menus/:id',              adminAuth, menuController.deleteMenu);

// ─── Delivery Orders — Public ─────────────────────────────────────────────────
router.post('/delivery/orders',              delivery.createDeliveryOrder);
router.get ('/delivery/orders/:id',          delivery.getDeliveryOrder);      // ลูกค้าติดตาม
router.get ('/delivery/history',             delivery.getOrdersByPhone);       // ประวัติออเดอร์ตามเบอร์

// อัปโหลดสลีป (public — ลูกค้าทำเอง, ต้องมี multipart)
router.post('/delivery/orders/:id/slip', upload.single('slip'), delivery.uploadPaymentSlip);

// ─── Delivery Orders — Admin ──────────────────────────────────────────────────
router.get  ('/delivery/orders',               adminAuth, delivery.getAllDeliveryOrders);
router.patch('/delivery/orders/:id/status',    adminAuth, delivery.updateDeliveryStatus);

// ─── Stats — Admin ────────────────────────────────────────────────────────────
router.get('/stats/today', adminAuth, delivery.getTodayStats);

module.exports = router;
