const express = require("express");
const router = express.Router();
const apiController = require("../controllers/apiController");
const verifyToken = require("../middleware/verifyToken");
const upload = require("../middleware/upload");
router.get("/auth/apidocs", apiController.getApiDocumentation);
router.post("/auth/login", apiController.login);
router.post("/auth/forgotPassword", apiController.forgotPassword);

router.get("/auth/users", verifyToken, apiController.getUsersWithMeta);
router.get("/auth/unicusers", verifyToken, apiController.getUnicUsersWithMeta);
router.post("/auth/insertuser", verifyToken, apiController.adduser);
router.get("/auth/getauthuser", verifyToken, apiController.getauthuser);
router.post("/auth/updateAuthUser", verifyToken, apiController.updateAuthUser);
router.post("/auth/updatePassword", verifyToken, apiController.updatePassword);
router.post(
  "/auth/uploadProfilePic",
   [
    verifyToken, // Auth middleware
    upload.fields([
      { name: "profile_pic", maxCount: 1 }
    ]),
  ],
  apiController.uploadProfilePic
);
router.post(
  "/auth/addnewscategory",
  verifyToken,
  apiController.addnewscategory
);
router.get("/auth/getallnewscategory", apiController.getAllNewsCategories);
router.post(
  "/auth/updatenewscategory",
  verifyToken,
  apiController.updateNewsCategory
);
router.post(
  "/auth/deletenewscategory",
  verifyToken,
  apiController.deletenewsCategory
);
router.post(
  "/auth/addnews",
  [
    verifyToken, // Auth middleware
    upload.fields([
      { name: "featured_image", maxCount: 1 }, // Single featured image
      { name: "images", maxCount: 5 }, // Multiple images (up to 5)
    ]),
  ],
  apiController.addNews
);
router.post(
  "/auth/updatenews",
  upload.fields([
    { name: "featured_image", maxCount: 1 },
    { name: "images", maxCount: 5 },
  ]),
  apiController.updateNews
);
router.post("/auth/deletenews", verifyToken, apiController.deleteNews);
router.get("/auth/getallnews", apiController.getAllNews);
router.get("/auth/getNewsById/:id", apiController.getNewsById);

router.post("/auth/addjobcategory", verifyToken, apiController.addJobsCategory);
router.get("/auth/getalljobcategory", apiController.getAllJobsCategories);
router.post(
  "/auth/updatejobcategory",
  verifyToken,
  apiController.updateJobsCategory
);
router.post(
  "/auth/deletejobcategory",
  verifyToken,
  apiController.deleteJobsCategory
);

router.post(
  "/auth/addjob",
  [
    verifyToken, // Auth middleware
    upload.single("featured_image"), // File upload middleware
  ],
  apiController.addJob
);

router.post(
  "/auth/updatejob",
  upload.fields([{ name: "featured_image", maxCount: 1 }]),
  apiController.updateJob
);
router.post("/auth/deletejob", verifyToken, apiController.deleteJob);
router.get("/auth/getalljobs", apiController.getAllJobs);
router.get(
  "/auth/getjobsbycategory/:categoryId",
  apiController.getJobsByCategoryId
);
router.get("/auth/getJobById/:id", apiController.getJobById);

router.post(
  "/auth/addeventcategory",
  verifyToken,
  apiController.addEventsCategory
);
router.post(
  "/auth/updateeventcategory",
  verifyToken,
  apiController.updateEventsCategory
);
router.post(
  "/auth/deleteeventcategory",
  verifyToken,
  apiController.deleteEventsCategory
);
router.get("/auth/getalleventcategory", apiController.getAllEventsCategories);
router.post(
  "/auth/addevent",
  [
    verifyToken, // Auth middleware
    upload.fields([
      { name: "featured_image", maxCount: 1 }, // Single featured image
      { name: "files", maxCount: 5 }, // Multiple images (up to 5)
    ]),
  ],
  apiController.addEvent
);

router.post(
  "/auth/updateevent",
  upload.fields([
    { name: "featured_image", maxCount: 1 },
    { name: "files", maxCount: 10 },
  ]),
  apiController.updateEvent
);

router.post("/auth/deleteevent", verifyToken, apiController.deleteEvent);
router.get("/auth/getallevents", apiController.getAllEvents);
router.get("/auth/getEventById/:id", apiController.getEventById);

router.post(
  "/auth/addparksandrecreationcontent",
  [
    verifyToken, // Auth middleware
    upload.fields([
      { name: "image", maxCount: 1 }, // Single featured image
    ]),
  ],
  apiController.addParksAndRecreationContent
);

router.post(
  "/auth/updateparksandrecreationcontent",
  upload.fields([{ name: "image", maxCount: 1 }]),
  apiController.updateParksAndRecreationContent
);
router.get(
  "/auth/getparksandrecreationcontent",
  apiController.getParksAndRecreationContent
);
router.post(
  "/auth/addParksAndRecreationCategory",
  [
    verifyToken, // Auth middleware
    upload.fields([
      { name: "image", maxCount: 1 }, // Multiple images (up to 5)
    ]),
  ],
  apiController.addParksAndRecreationCategory
);

router.post(
  "/auth/updateParksAndRecreationCategory",
  [
    verifyToken, // Auth middleware
    upload.fields([
      { name: "image", maxCount: 1 }, // Multiple images (up to 5)
    ]),
  ],
  apiController.updateParksAndRecreationCategory
);

router.post(
  "/auth/deleteParksAndRecreationCategory",
  verifyToken,
  apiController.deleteParksAndRecreationCategory
);
router.get(
  "/auth/getAllParksAndRecreationCategories",
  apiController.getAllParksAndRecreationCategories
);
router.get(
  "/auth/getParksAndRecreationCategoryById/:id",
  apiController.getParksAndRecreationCategoryById
);
router.post(
  "/auth/addParksAndRecreation",
  [
    verifyToken, // Auth middleware
    upload.fields([
      { name: "featured_image", maxCount: 1 }, // Multiple images (up to 5)
      { name: "images", maxCount: 50 },
    ]),
  ],
  apiController.addParksAndRecreation
);

router.post(
  "/auth/updateParksAndRecreation",
  upload.fields([
    { name: "featured_image", maxCount: 1 },
    { name: "images", maxCount: 10 },
  ]),
  apiController.updateParksAndRecreation
);
router.post(
  "/auth/deleteParksAndRecreationById",
  verifyToken,
  apiController.deleteParksAndRecreationById
);

router.get(
  "/auth/getAllParksAndRecreationByCategoryId/:categoryId",
  apiController.getAllParksAndRecreationByCategoryId
);

router.post(
  "/auth/addRecyclingAndGarbageContent",
  [
    verifyToken, // Auth middleware
    upload.fields([
      { name: "image", maxCount: 1 }, // Single featured image
    ]),
  ],
  apiController.addRecyclingAndGarbageContent
);

router.post(
  "/auth/updateRecyclingAndGarbageContent",
  upload.fields([{ name: "image", maxCount: 1 }]),
  apiController.updateRecyclingAndGarbageContent
);

// router.post('/auth/deleteRecyclingAndGarbageContent', verifyToken, apiController.deleteRecyclingAndGarbageContent);
router.get(
  "/auth/getRecyclingAndGarbageContent",
  apiController.getRecyclingAndGarbageContent
);

router.post(
  "/auth/addRecyclingAndGarbage",
  [verifyToken, upload.fields([{ name: "image", maxCount: 1 }])],
  apiController.addRecyclingAndGarbage
);

router.post(
  "/auth/addRecyclingAndGarbage",
  [verifyToken, upload.fields([{ name: "image", maxCount: 1 }])],
  apiController.addRecyclingAndGarbage
);
router.post(
  "/auth/updateRecyclingAndGarbage",
  [verifyToken, upload.fields([{ name: "image", maxCount: 1 }])],
  apiController.updateRecyclingAndGarbage
);
router.post(
  "/auth/deleteRecyclingAndGarbage",
  verifyToken,
  apiController.deleteRecyclingAndGarbage
);
router.get(
  "/auth/getAllRecyclingAndGarbage",
  apiController.getAllRecyclingAndGarbage
);
router.get(
  "/auth/getRecyclingAndGarbageById/:id",
  apiController.getRecyclingAndGarbageById
);

router.post(
  "/auth/addpagescategory",
  verifyToken,
  apiController.addPagesCategory
);
router.post(
  "/auth/updatePagesCategory",
  verifyToken,
  apiController.updatePagesCategory
);
router.post(
  "/auth/deletePagesCategory",
  verifyToken,
  apiController.deletePagesCategory
);
router.get("/auth/getallpagescategory", apiController.getAllPagesCategories);

router.post(
  "/auth/addpages",
  [
    verifyToken, // Auth middleware
    upload.fields([
      { name: "featured_image", maxCount: 1 }, // Single featured image
      { name: "images", maxCount: 5 }, // Multiple images (up to 5)
    ]),
  ],
  apiController.addPages
);

router.post(
  "/auth/updatepages",
  [
    verifyToken, // Auth middleware
    upload.fields([
      { name: "featured_image", maxCount: 1 }, // Single featured image
      { name: "images", maxCount: 5 }, // Multiple images (up to 5)
    ]),
  ],
  apiController.updatePages
);

router.post("/auth/deletePages", verifyToken, apiController.deletePages);

router.get("/auth/getAllPages", apiController.getAllPages);

router.get(
  "/auth/getAllPagesByCategoryId/:categoryId",
  apiController.getAllPagesByCategoryId
);

router.post("/auth/sendContactForm", apiController.sendContactForm);

module.exports = router;
