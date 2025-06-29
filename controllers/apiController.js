const db = require("../models");
const {
  User,
  UserMeta,
  NewsCategory,
  News,
  JobsCategory,
  Jobs,
  EventsCategory,
  Events,
  ParksAndRecreationContent,
  ParksAndRecreationCategory,
  ParksAndRecreation,
  RecyclingAndGarbageContent,
  RecyclingAndGarbage,
  PagesCategory,
  Pages,
  Notifications,
  Roles
} = require("../models");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");
const JWT_SECRET = process.env.JWT_SECRET;
const { Op, fn, col, where, literal } = require("sequelize");
const { sequelize } = require("../models");
const admin = require("../firebase");
const roles = require("../models/roles");

// Common notification function
const sendFirebaseNotification = async ({ req, title, body, imageFilename = null, type = 'custom' }) => {
  try {

    const imageUrl = imageFilename
      ? `${req.protocol}://${req.get("host")}/images/${imageFilename}`
      : null;



    const message = {
      notification: {
        title,
        body,
        ...(imageUrl ? { image: imageUrl } : {}),
      },
      android: {
        notification: {
          sound: "default",
          ...(imageUrl ? { imageUrl } : {}),
        },
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
          },
        },
      },
      topic: "all",
    };

    const firebaseResponse = await admin.messaging().send(message);

    // Save to Notifications table
    await Notifications.create({
      title,
      body,
      image: imageFilename,
      type,
    });

    return { success: true, firebaseResponse };
  } catch (err) {
    console.error("Firebase Notification Error:", err);
    return { success: false, error: err.message };
  }
};

exports.getUsersWithMeta = async (req, res) => {
  try {
    const users = await db.User.findAll({ include: db.UserMeta });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
exports.getUnicUsersWithMeta = async (req, res) => {
  try {
    const { id } = req.body;
    const user = await db.User.findOne({
      where: { id },
      include: db.UserMeta,
    });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
exports.adduser = async (req, res) => {
  try {
    const { name, role, password, email, address, phone, gender } =
      req.body;
    const hashedPassword = await bcrypt.hash(password, 10); // 10 is the salt rounds
    const newUser = await User.create({
      name,
      role,
      email,
      phone,
      password: hashedPassword,
    });
    await UserMeta.create({
      userId: newUser.id,
      address,
      gender
    });
    res.json({ message: "Data Insert Successfully", success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { id, name, role, password, email, address, phone, gender, status } = req.body;

    if (!id) {
      return res.status(400).json({ message: "User ID is required", success: false });
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: "User not found", success: false });
    }

    // Prepare user update fields
    const updatedData = {
      ...(name && { name }),
      ...(role && { role }),
      ...(email && { email }),
      ...(phone && { phone }),
      ...(status !== undefined && { status }),
    };

    // If password is provided, hash it
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updatedData.password = hashedPassword;
    }

    await user.update(updatedData);

    // Update or create user meta
    const [meta, created] = await UserMeta.findOrCreate({
      where: { userId: id },
      defaults: {
        address,
        gender,
      },
    });

    if (!created) {
      await meta.update({
        ...(address && { address }),
        ...(gender && { gender }),
      });
    }

    return res.json({ message: "User updated successfully", success: true });
  } catch (err) {
    console.error("Update User Error:", err);
    res.status(500).json({ message: err.message, success: false });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ message: "User ID is required", success: false });
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: "User not found", success: false });
    }

    // Delete associated metadata first (if exists)
    await UserMeta.destroy({ where: { userId: id } });

    // Delete user
    await user.destroy();

    return res.json({ message: "User deleted successfully", success: true });
  } catch (err) {
    console.error("Delete User Error:", err);
    return res.status(500).json({ message: err.message, success: false });
  }
};
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      include: [
        {
          model: UserMeta,
          as: "meta", // make sure you have an alias in the model association if needed
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.status(200).json({
      success: true,
      message: "Users fetched successfully",
      data: users,
    });
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: "User not valid" });
    }

    // Compare password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: "Invalid password" });
    }

    // Fetch permissions from Roles table manually (based on role name or ID)
    const roleData = await Roles.findOne({ where: { role: user.role } });
    const permissions = roleData?.permissions || {};

    // Create JWT payload
    const payload = {
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        permissions,
      },
    };

    // Sign token
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "28d" });

    res.json({ payload, token });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
exports.getauthuser = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.data.id;

    // Get user with meta
    const user = await db.User.findOne({
      where: { id: userId },
      include: [{ model: db.UserMeta, as: "meta" }],
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get role permissions separately based on user.role
    const roleData = await Roles.findOne({
      where: { role: user.role },
      attributes: ["permissions"],
    });

    const baseUrl = `${req.protocol}://${req.get("host")}/images/`;
    if (user.meta?.profile_pic) {
      user.meta.profile_pic = baseUrl + user.meta.profile_pic;
    }

    const responseData = {
      ...user.toJSON(),
      permissions: roleData?.permissions || {},
    };

    res.status(200).json(responseData);
  } catch (err) {
    console.error("Get Auth User Error:", err);
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.updateAuthUser = async (req, res) => {
  try {
    // 1. Extract token
    const token = req.headers.authorization?.split(" ")[1]; // Format: "Bearer <token>"
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    // 2. Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.data.id; // Assuming token payload has "data.id"

    // 3. Extract body params
    const { name, address, phone, gender } = req.body;

    if (!name || !address || !phone || !gender) {
      return res.status(400).json({ message: "All fields are required." });
    }

    // 4. Find user and meta using correct alias
    const user = await db.User.findOne({
      where: { id: userId },
      include: {
        model: db.UserMeta,
        as: 'meta',
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 5. Update User fields
    user.name = name;
    user.phone = phone;
    await user.save();

    // 6. Update UserMeta fields via alias
    if (user.meta) {
      user.meta.address = address;
      user.meta.gender = gender;
      await user.meta.save();
    }

    // 7. Respond with updated user
    return res.status(200).json({
      message: "User updated successfully",
      user,
    });

  } catch (err) {
    console.error("Error updating user:", err);
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
    return res.status(500).json({ message: "Internal server error" });
  }
};
exports.updatePassword = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1]; // Bearer <token>
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.data.id;

    const { currentPassword, newPassword, confirmNewPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      return res
        .status(400)
        .json({ message: "All password fields are required" });
    }

    if (newPassword !== confirmNewPassword) {
      return res
        .status(400)
        .json({ message: "New password and confirm password do not match" });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    return res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Password update error:", error);
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.query;

  if (!email) return res.status(400).json({ message: "Email is required" });

  try {
    const user = await db.User.findOne({ where: { email } });

    if (!user)
      return res
        .status(404)
        .json({ message: "User not found with this email" });

    // Generate 6-digit random code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Send email
    const transporter = nodemailer.createTransport({
      service: "Gmail", // or use your own SMTP
      auth: {
        user: "blueowlservicesny@gmail.com",
        pass: "wxywwwwfbiloiosh",
      },
    });

    const mailOptions = {
      from: "blueowlservicesny@gmail.com",
      to: email,
      subject: "Password Reset Code",
      html: `<p>Your password reset code is: <b>${resetCode}</b></p>`,
    };

    await transporter.sendMail(mailOptions);

    res.json({ message: "Reset code sent to your email" });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Something went wrong", error: err.message });
  }
};
// exports.uploadProfilePic = async (req, res) => {
//   const userId = req.user.userId;
//   const { profile_pic } = req.body;
//   if (!profile_pic) {
//     return res.status(400).json({ message: "No image data provided" });
//   }
//   try {
//     const user = await db.UserMeta.findOne({ where: { userId: userId } });
//     const matches = profile_pic.match(/^data:image\/(\w+);base64,(.+)$/);
//     if (!matches || matches.length !== 3) {
//       return res.status(400).json({ message: "Invalid image format" });
//     }
//     let ext = matches[1].toLowerCase();
//     const base64Data = matches[2];
//     if (ext === "jpeg") ext = "jpg";
//     const fileName = `image_Profile${Date.now()}.${ext}`;
//     const filePath = path.join(__dirname, "../images", fileName);
//     fs.writeFileSync(filePath, base64Data, "base64");
//     user.profile_pic = fileName;
//     await user.save();
//     res.json({
//       message: "Profile picture uploaded successfully",
//       profile_pic: fileName,
//     });
//   } catch (err) {
//     console.error(err);
//     res
//       .status(500)
//       .json({ message: "Failed to upload image", error: err.message });
//   }

//   res.json({ user });
// };


exports.uploadProfilePic = async (req, res) => {
  try {
    // 1. Extract and verify token
    const token = req.headers.authorization?.split(" ")[1]; // "Bearer <token>"
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.data.id || decoded.userId || decoded.id; // adjust based on your payload structure

    // 2. Get uploaded file from `profile_pic` field
    const uploadedFile =
      req.files && req.files["profile_pic"]
        ? req.files["profile_pic"][0]
        : null;

    if (!uploadedFile) {
      return res.status(400).json({ message: "No image file uploaded" });
    }

    // 3. Find and update the user
    const user = await db.UserMeta.findOne({ where: { userId } });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.profile_pic = uploadedFile.filename;
    await user.save();

    res.json({
      message: "Profile picture uploaded successfully",
      profile_pic: uploadedFile.filename,
    });
  } catch (err) {
    console.error("Upload error:", err);
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
    res.status(500).json({
      message: "Failed to upload image",
      error: err.message,
    });
  }
};

exports.addnewscategory = async (req, res) => {
  try {
    // 1. Get token from header
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    // 2. Decode token and get userId
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.data.id;

    // 3. Get name from body
    const { name } = req.body;
    if (!name || name.trim() === "") {
      return res.status(400).json({ message: "Category name is required" });
    }

    // 4. Create category
    const category = await NewsCategory.create({ userId, name });

    res.status(201).json({
      message: "News category created successfully",
      data: category,
    });
  } catch (error) {
    console.error("Error creating category:", error);
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getAllNewsCategories = async (req, res) => {
  try {
    const categories = await NewsCategory.findAll();

    res.status(200).json({
      message: "Active categories fetched successfully",
      data: categories,
    });
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.updateNewsCategory = async (req, res) => {
  try {
    const { id, name, status } = req.body;

    const category = await NewsCategory.findByPk(id);

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    // Update fields
    if (name) category.name = name;
    if (typeof status !== "undefined") category.status = status;

    await category.save();

    res.status(200).json({
      message: "Category updated successfully",
      data: category,
    });
  } catch (error) {
    console.error("Error updating category:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.deletenewsCategory = async (req, res) => {
  try {
    const { id } = req.body;

    const category = await NewsCategory.findByPk(id);

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    await category.destroy();

    res.status(200).json({ message: "Category deleted successfully" });
  } catch (error) {
    console.error("Error deleting category:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.addNews = async (req, res) => {
  try {
    // Extract token and get userId
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.data.id; // adjust based on your token payload

    const {
      title,
      description,
      shortdescription,
      category_id,
      status,
      published_at,
    } = req.body;

    // Get uploaded files
    const featuredImageFile = req.files?.["featured_image"]
      ? req.files["featured_image"][0]
      : null;

    const imagesFiles = req.files?.["images"] || [];

    // Prepare fields to save
    const featured_image = featuredImageFile
      ? featuredImageFile.filename
      : null;

    const images =
      imagesFiles.length > 0
        ? imagesFiles.map((file) => file.filename).join(",")
        : null;

    // Create the news record
    const news = await News.create({
      userId,
      title,
      description,
      shortdescription,
      featured_image,
      images,
      category_id,
      status,
      published_at,
    });

    try {
      const response = await sendFirebaseNotification({
        title: `New News Added: ${title}`,
        body: "A new News has been published.",
        imageFilename: null,
        type: "custom",
      });
      console.error("Notification Send:", response);

    } catch (notifErr) {
      console.error("Notification Send Error:", notifErr.message);
    }


    return res.status(201).json({
      message: "News added successfully",
      data: news,
    });
  } catch (error) {
    console.error("Error adding news:", error);

    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.getAllNews = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 4;
    const offset = (page - 1) * limit;
    const keyword = req.query.keyword || "";
    const status = typeof req.query.status !== "undefined" ? req.query.status : 1;
    const category_id = req.query.category_id || null;

    const baseUrl = `${req.protocol}://${req.get("host")}/images/`;

    const whereCondition = {
      ...(status !== "all" && { status }),
      ...(category_id && { category_id }),
      [Op.or]: [
        { title: { [Op.like]: `%${keyword}%` } },
        { shortdescription: { [Op.like]: `%${keyword}%` } },
        { description: { [Op.like]: `%${keyword}%` } },
      ],
    };

    const finalWhere = keyword || status !== "all" || category_id ? whereCondition : {};

    const { count, rows: news } = await News.findAndCountAll({
      where: finalWhere,
      limit,
      offset,
      order: [["createdAt", "DESC"]],
      include: [
        {
          model: NewsCategory,
          as: "category",
          attributes: ["id", "name"],
        },
        {
          model: User,
          as: "author",
          attributes: ["id", "name", "email"],
        },
      ],
    });

    const updatedNews = news.map((item) => ({
      ...item.toJSON(),
      featured_image: item.featured_image ? baseUrl + item.featured_image : null,
      images: item.images
        ? item.images.split(",").map((filename) => baseUrl + filename)
        : [],
    }));

    return res.status(200).json({
      success: updatedNews.length > 0,
      message: updatedNews.length > 0 ? "News fetched successfully" : "No news found",
      data: updatedNews,
      pagination: {
        total: count,
        page,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching news:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};





exports.getNewsById = async (req, res) => {
  try {
    const newsId = req.params.id;

    const baseUrl = `${req.protocol}://${req.get("host")}/images/`;

    const news = await News.findOne({
      where: { id: newsId },
      include: [
        {
          model: NewsCategory,
          as: "category",
          attributes: ["id", "name"],
        },
        {
          model: User,
          as: "author",
          attributes: ["id", "name", "email"],
        },
      ],
    });

    if (!news) {
      return res.status(404).json({ message: "News not found" });
    }

    const newsData = news.toJSON();

    // Add full path for featured_image
    newsData.featured_image = newsData.featured_image
      ? baseUrl + newsData.featured_image
      : null;

    // Parse and transform images array
    if (newsData.images) {
      let imagesArray = [];

      if (Array.isArray(newsData.images)) {
        imagesArray = newsData.images;
      } else if (typeof newsData.images === "string") {
        try {
          imagesArray = JSON.parse(newsData.images);
        } catch {
          imagesArray = newsData.images.split(",");
        }
      }

      newsData.images = imagesArray.map((img) => baseUrl + img.trim());
    }

    return res.status(200).json({
      message: "News details fetched successfully",
      data: newsData,
    });
  } catch (error) {
    console.error("Error fetching news details:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.updateNews = async (req, res) => {
  try {
    // console.log("sdfsdf"+JSON.stringify(req.query));
    const id = req.body.id;

    if (!id) {
      return res
        .status(400)
        .json({ message: "ID is required", success: false });
    }

    const {
      title,
      description,
      shortdescription,
      category_id,
      status,
      existing_images, // This will come as JSON string
      published_at,
    } = req.body;

    // Find existing news
    const news = await News.findByPk(id);

    if (!news) {
      return res
        .status(404)
        .json({ message: "News not found", success: false });
    }

    // Handle files
    const featuredImageFile = req.files?.["featured_image"]?.[0] || null;
    const imagesFiles = req.files?.["images"] || [];

    const featured_image = featuredImageFile
      ? featuredImageFile.filename
      : news.featured_image;

    const extractFilename = (img) => {
      if (typeof img !== 'string') return img;
      const urlParts = img.split('/');
      return urlParts[urlParts.length - 1].split('?')[0]; // Remove query params if any
    };


    let images = [];

    // 1. Add existing images that weren't removed
    if (existing_images) {
      try {
        const parsedExistingImages = JSON.parse(existing_images);
        if (Array.isArray(parsedExistingImages)) {
          images = parsedExistingImages.map(img => extractFilename(img));
        }
      } catch (e) {
        console.error("Error parsing existing_images", e);
      }
    }

    // 2. Add new images (just store filenames)
    if (req.files?.["images"]) {
      const newImages = req.files["images"].map(file => file.filename);
      images = images.concat(newImages);
    }

    // If no images were provided at all, keep the original ones
    if (images.length === 0 && !req.files?.["images"]) {
      images = news.images ? news.images.split(',') : [];
    }

    await news.update({
      title,
      description,
      shortdescription,
      featured_image,
      images: images.join(','),
      category_id,
      status,
      published_at,
    });

    return res.status(200).json({
      message: "News updated successfully",
      data: news,
      success: true,
    });
  } catch (error) {
    console.error("Error updating news:", error);
    return res
      .status(500)
      .json({ message: "Internal server error", success: false });
  }
};

exports.deleteNews = async (req, res) => {
  try {
    const { id } = req.body;

    // Find the news article
    const news = await News.findByPk(id);

    if (!news) {
      return res.status(404).json({ message: "News not found" });
    }

    // Delete the news article
    await news.destroy();

    return res.status(200).json({ message: "News deleted successfully" });
  } catch (error) {
    console.error("Error deleting news:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.addJobsCategory = async (req, res) => {
  try {
    // 1. Extract and verify token
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.data.id; // Ensure your JWT contains this

    // 2. Extract category name
    const { name } = req.body;

    if (!name || name.trim() === "") {
      return res
        .status(400)
        .json({ message: "Job category name is required" });
    }

    // 3. Create category
    const category = await JobsCategory.create({ userId, name });

    res.status(201).json({
      message: "Job category created successfully",
      data: category,
    });
  } catch (error) {
    console.error("Error creating job category:", error);

    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getAllJobsCategories = async (req, res) => {
  try {
    const categories = await JobsCategory.findAll({
      include: [
        {
          model: Jobs,
          as: "jobs",
          where: { status: 1 },
          required: false, // allow categories even if they have 0 active jobs
          attributes: [],
        },
      ],
      attributes: {
        include: [
          [
            // Count only jobs with status: 1
            sequelize.literal(`(
              SELECT COUNT(*)
              FROM jobs AS job
              WHERE job.category_id = jobscategory.id AND job.status = 1
            )`),
            "totalopenings",
          ],
        ],
      },
    });

    res.status(200).json({
      message: "Active job categories fetched successfully",
      data: categories,
    });
  } catch (error) {
    console.error("Error fetching job categories:", error);
    res.status(500).json({ message: error.message });
  }
};

exports.updateJobsCategory = async (req, res) => {
  try {
    const { id, name, status } = req.body;

    const category = await JobsCategory.findByPk(id);

    if (!category) {
      return res.status(404).json({ message: "Job category not found" });
    }

    if (name) category.name = name;
    if (typeof status !== "undefined") category.status = status;

    await category.save();

    res.status(200).json({
      message: "Job category updated successfully",
      data: category,
    });
  } catch (error) {
    console.error("Error updating job category:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
exports.deleteJobsCategory = async (req, res) => {
  try {
    const { id } = req.body;

    const category = await JobsCategory.findByPk(id);

    if (!category) {
      return res.status(404).json({ message: "Job category not found" });
    }

    await category.destroy();

    res.status(200).json({ message: "Job category deleted successfully" });
  } catch (error) {
    console.error("Error deleting job category:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
exports.addJob = async (req, res) => {
  try {
    // 1. Extract and verify token
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.data.id; // Token में { data: { id: ... } } होना चाहिए

    // 2. Destructure other job fields
    const {
      title,
      description,
      shortdescription,
      link,
      apply_link,
      category_id,
      status,
      published_at,
    } = req.body;

    // 3. Handle featured image
    const featured_image = req.file ? req.file.filename : null;

    // 4. Create job entry
    const job = await Jobs.create({
      userId,
      title,
      description,
      shortdescription,
      featured_image,
      link,
      apply_link,
      category_id,
      status,
      published_at,
    });
    try {
      const response = await sendFirebaseNotification({
        title: `New Job Added: ${title}`,
        body: "A new Job has been published.",
        imageFilename: null,
        type: "custom",
      });
      console.error("Notification Send:", response);

    } catch (notifErr) {
      console.error("Notification Send Error:", notifErr.message);
    }

    return res.status(201).json({
      message: "Job added successfully",
      data: job,
    });
  } catch (error) {
    console.error("Error adding job:", error);

    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.updateJob = async (req, res) => {
  try {
    const {
      id,
      userId,
      title,
      description,
      link,
      apply_link,
      shortdescription,
      category_id,
      status,
      published_at,
    } = req.body;

    // Find existing job
    const job = await Jobs.findByPk(id);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    // Handle uploaded files
    const featuredImageFile = req.files["featured_image"]
      ? req.files["featured_image"][0]
      : null;
    const imagesFiles = req.files["images"] || [];

    // Update fields if provided
    job.userId = userId || job.userId;
    job.title = title || job.title;
    job.description = description || job.description;
    job.shortdescription = shortdescription || job.shortdescription;
    job.link = link || job.link;
    job.apply_link = apply_link || job.apply_link;
    job.category_id = category_id || job.category_id;
    job.status = typeof status !== "undefined" ? status : job.status;
    job.published_at = published_at || job.published_at;

    if (featuredImageFile) {
      job.featured_image = featuredImageFile.filename;
    }

    if (imagesFiles.length > 0) {
      job.images = imagesFiles.map((file) => file.filename).join(",");
    }

    await job.save();

    return res.status(200).json({
      success: true,
      message: "Job updated successfully",
      data: job,
    });
  } catch (error) {
    console.error("Error updating job:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getAllJobs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const status = req.query.status !== undefined ? req.query.status : 1;
    const keyword = req.query.keyword || "";
    const category_id = req.query.category_id || null;

    const baseUrl = `${req.protocol}://${req.get("host")}/images/`;

    const whereClause = {
      ...(status !== "all" && { status }),
      ...(category_id && { category_id }),
      [Op.or]: [
        { title: { [Op.like]: `%${keyword}%` } },
        { shortdescription: { [Op.like]: `%${keyword}%` } },
        { description: { [Op.like]: `%${keyword}%` } },
      ],
    };

    const finalWhere = keyword || status !== "all" || category_id ? whereClause : {};

    const { count, rows: jobs } = await Jobs.findAndCountAll({
      where: finalWhere,
      limit,
      offset,
      order: [["published_at", "DESC"]],
      include: [
        {
          model: JobsCategory,
          as: "category",
          attributes: ["id", "name"],
        },
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "email"],
        },
      ],
    });

    const updatedJobs = jobs.map((job) => ({
      ...job.toJSON(),
      featured_image: job.featured_image
        ? baseUrl + job.featured_image
        : null,
    }));

    return res.status(200).json({
      success: updatedJobs.length > 0,
      message: updatedJobs.length > 0
        ? "Jobs fetched successfully"
        : "No jobs found",
      data: updatedJobs,
      pagination: {
        totalItems: count,
        currentPage: page,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching jobs:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};



exports.getJobsByCategoryId = async (req, res) => {
  try {
    const categoryId = parseInt(req.params.categoryId);
    const keyword = req.query.keyword || "";
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const baseUrl = `${req.protocol}://${req.get("host")}/images/`;

    const { count, rows: jobs } = await Jobs.findAndCountAll({
      where: {
        category_id: categoryId,
        [Op.or]: [
          { title: { [Op.like]: `%${keyword}%` } },
          { description: { [Op.like]: `%${keyword}%` } },
          { shortdescription: { [Op.like]: `%${keyword}%` } },
        ],
      },
      limit,
      offset,
      order: [["published_at", "DESC"]],
      include: [
        {
          model: JobsCategory,
          as: "category",
          attributes: ["id", "name"],
        },
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "email"],
        },
      ],
    });

    const updatedJobs = jobs.map((job) => ({
      ...job.toJSON(),
      featured_image: job.featured_image ? baseUrl + job.featured_image : null,
    }));

    return res.status(200).json({
      success: updatedJobs.length > 0,
      message:
        updatedJobs.length > 0
          ? "Jobs fetched successfully"
          : "No jobs found for this category",
      data: updatedJobs,
      pagination: {
        totalItems: count,
        currentPage: page,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching jobs by category:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getJobById = async (req, res) => {
  try {
    const { id } = req.params;
    const baseUrl = `${req.protocol}://${req.get("host")}/images/`;

    const job = await Jobs.findOne({
      where: { id },
      include: [
        {
          model: JobsCategory,
          as: "category",
          attributes: ["id", "name"],
        },
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "email"],
        },
      ],
    });

    if (!job) return res.status(404).json({ message: "Job not found" });

    const jobData = job.toJSON();

    // Add full path to featured_image
    jobData.featured_image = jobData.featured_image
      ? baseUrl + jobData.featured_image
      : null;

    return res.status(200).json({
      message: "Job fetched successfully",
      data: jobData,
    });
  } catch (error) {
    console.error("Error fetching job by ID:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.deleteJob = async (req, res) => {
  try {
    const { id } = req.body;

    const job = await Jobs.findByPk(id);

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    await job.destroy();

    return res.status(200).json({ message: "Job deleted successfully" });
  } catch (error) {
    console.error("Error deleting job:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.addEventsCategory = async (req, res) => {
  try {
    // 1. Extract and verify token
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.data.id; // Ensure your token payload is structured as: { data: { id: userId } }

    // 2. Validate input
    const { name } = req.body;
    if (!name || name.trim() === "") {
      return res.status(400).json({ message: "Event category name is required" });
    }

    // 3. Create category
    const category = await EventsCategory.create({ userId, name });

    // 4. Return response
    res.status(201).json({
      message: "Event category created successfully",
      data: category,
    });
  } catch (error) {
    console.error("Error creating event category:", error);

    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    res.status(500).json({ message: "Internal server error" });
  }
};

exports.updateEventsCategory = async (req, res) => {
  try {
    const { id, name, status } = req.body;

    const category = await EventsCategory.findByPk(id);

    if (!category) {
      return res.status(404).json({ message: "Event category not found" });
    }

    if (name) category.name = name;
    if (typeof status !== "undefined") category.status = status;

    await category.save();

    res.status(200).json({
      message: "Event category updated successfully",
      data: category,
    });
  } catch (error) {
    console.error("Error updating event category:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
exports.deleteEventsCategory = async (req, res) => {
  try {
    const { id } = req.body;

    const category = await EventsCategory.findByPk(id);

    if (!category) {
      return res.status(404).json({ message: "Event category not found" });
    }

    await category.destroy();

    res.status(200).json({ message: "Event category deleted successfully" });
  } catch (error) {
    console.error("Error deleting event category:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
exports.getAllEventsCategories = async (req, res) => {
  try {
    const categories = await EventsCategory.findAll();

    res.status(200).json({
      message: "Active event categories fetched successfully",
      data: categories,
    });
  } catch (error) {
    console.error("Error fetching event categories:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.addEvent = async (req, res) => {
  try {
    // 1. Extract user ID from token
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.data.id;

    // 2. Extract fields from request body
    const {
      title,
      description,
      shortdescription,
      address,
      link,
      category_id,
      date,
      time,
      organizor,
      status,
      published_at,
    } = req.body;

    // 3. Handle uploaded files
    const featuredImageFile = req.files?.["featured_image"]?.[0] || null;
    const filesUploads = req.files?.["files"] || [];

    const featured_image = featuredImageFile ? featuredImageFile.filename : null;
    const files = filesUploads.length > 0
      ? filesUploads.map((file) => file.filename).join(",")
      : null;

    // 4. Create the event
    const event = await Events.create({
      userId,
      title,
      description,
      shortdescription,
      featured_image,
      files,
      link,
      category_id,
      address,
      date,
      time,
      organizor,
      status,
      published_at,
    });
    try {
      const response = await sendFirebaseNotification({
        title: `New Event Added: ${title}`,
        body: "A new Event has been published.",
        imageFilename: null,
        type: "custom",
      });
      console.error("Notification Send:", response);

    } catch (notifErr) {
      console.error("Notification Send Error:", notifErr.message);
    }

    // 5. Respond
    return res.status(201).json({
      message: "Event added successfully",
      data: event,
    });
  } catch (error) {
    console.error("Error adding event:", error);

    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    return res.status(500).json({ message: "Internal server error" });
  }
};


exports.updateEvent = async (req, res) => {
  try {
    const {
      id, // Event ID to update
      userId,
      title,
      description,
      shortdescription,
      link,
      category_id,
      address,
      date,
      time,
      organizor,
      status,
      existing_images, // This will come as JSON string
      published_at,
    } = req.body;

    // Find the event by ID
    const event = await Events.findByPk(id);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const extractFilename = (img) => {
      if (typeof img !== 'string') return img;
      const urlParts = img.split('/');
      return urlParts[urlParts.length - 1].split('?')[0]; // Remove query params if any
    };

    // Get uploaded files
    const featuredImageFile = req.files?.["featured_image"]?.[0] || null;

    let files = [];

    // 1. Add existing files that weren't removed (extract filenames)
    if (existing_images) {
      try {
        const parsedExistingFiles = JSON.parse(existing_images);
        if (Array.isArray(parsedExistingFiles)) {
          files = parsedExistingFiles.map(file => extractFilename(file));
        }
      } catch (e) {
        console.error("Error parsing existing_images", e);
      }
    }

    // 2. Add new files
    if (req.files?.["files"]) {
      const newFiles = req.files["files"].map(file => file.filename);
      files = files.concat(newFiles);
    }

    // If no files were provided at all, keep the original ones
    if (files.length === 0 && !req.files?.["files"]) {
      files = event.files ? event.files.split(',') : [];
    }

    // Update fields
    if (userId) event.userId = userId;
    if (title) event.title = title;
    if (description) event.description = description;
    if (shortdescription) event.shortdescription = shortdescription;
    if (address) event.address = address;
    if (link) event.link = link;
    if (category_id) event.category_id = category_id;
    if (date) event.date = date;
    if (time) event.time = time;
    if (organizor) event.organizor = organizor;
    if (typeof status !== "undefined") event.status = status;
    if (published_at) event.published_at = published_at;

    // If new files were uploaded, update paths
    if (featuredImageFile) event.featured_image = featuredImageFile.filename;


    event.files = files.join(',');

    // Save changes
    await event.save();

    return res.status(200).json({
      success: true,
      message: "Event updated successfully",
      data: event,
    });
  } catch (error) {
    console.error("Error updating event:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.deleteEvent = async (req, res) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ message: "Event ID is required" });
    }

    const event = await Events.findByPk(id);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    await event.destroy();

    return res.status(200).json({ message: "Event deleted successfully" });
  } catch (error) {
    console.error("Error deleting event:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.getAllEvents = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const { keyword, dateFrom, dateTo, category_id } = req.query;
    const status = req.query.status !== undefined ? req.query.status : 1;

    const baseUrl = `${req.protocol}://${req.get("host")}/images/`;

    const whereConditions = {};
    if (status !== "all") whereConditions.status = status;

    // 🔍 Keyword Search
    if (keyword) {
      whereConditions[Op.or] = [
        { title: { [Op.like]: `%${keyword}%` } },
        { shortdescription: { [Op.like]: `%${keyword}%` } },
        { description: { [Op.like]: `%${keyword}%` } },
      ];
    }

    // 📅 Date Filter
    const dateFilters = [];
    if (dateFrom && dateTo) {
      dateFilters.push(
        where(fn("DATE", col("date")), {
          [Op.between]: [dateFrom, dateTo],
        })
      );
    } else if (dateFrom) {
      dateFilters.push(
        where(fn("DATE", col("date")), {
          [Op.gte]: dateFrom,
        })
      );
    } else if (dateTo) {
      dateFilters.push(
        where(fn("DATE", col("date")), {
          [Op.lte]: dateTo,
        })
      );
    }

    if (dateFilters.length > 0) {
      whereConditions[Op.and] = [...(whereConditions[Op.and] || []), ...dateFilters];
    }

    // 📂 Filter by category_id
    if (category_id) {
      whereConditions.category_id = category_id;
    }

    const { count, rows: events } = await Events.findAndCountAll({
      where: whereConditions,
      limit,
      offset,
      order: [["createdAt", "DESC"]],
      include: [
        {
          model: EventsCategory,
          as: "category",
          attributes: ["id", "name"],
        },
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "email"],
        },
      ],
    });

    const updatedEvents = events.map((event) => ({
      ...event.toJSON(),
      featured_image: event.featured_image
        ? baseUrl + event.featured_image
        : null,
      files: event.files
        ? event.files.split(",").map((filename) => baseUrl + filename)
        : [],
    }));

    return res.status(200).json({
      success: updatedEvents.length > 0,
      message: updatedEvents.length > 0 ? "Events fetched successfully" : "No events found",
      data: updatedEvents,
      pagination: {
        total: count,
        page,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching events:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.getEventById = async (req, res) => {
  try {
    const { id } = req.params;
    const baseUrl = `${req.protocol}://${req.get("host")}/images/`;

    const event = await Events.findOne({
      where: { id },
      include: [
        {
          model: EventsCategory,
          as: "category",
          attributes: ["id", "name"],
        },
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "email"],
        },
      ],
    });

    if (!event) return res.status(404).json({ message: "Event not found" });

    const eventData = event.toJSON();

    // Add full path to featured_image
    eventData.featured_image = eventData.featured_image
      ? baseUrl + eventData.featured_image
      : null;

    // Add full path to each file in files (split by comma)
    eventData.files = eventData.files
      ? eventData.files.split(",").map((filename) => baseUrl + filename)
      : [];


    return res.status(200).json({
      message: "Event fetched successfully",
      data: eventData,
    });
  } catch (error) {
    console.error("Error fetching event by ID:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.addParksAndRecreationContent = async (req, res) => {
  try {
    // 1. Extract token and get userId
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.data.id;

    // 2. Get body data
    const { mission, vision, address, hours, contacts, status } = req.body;

    // 3. Get uploaded image file
    const imageFile = req.files?.["image"]?.[0] || null;
    const image = imageFile ? imageFile.filename : null;

    // 4. Create the record
    const record = await ParksAndRecreationContent.create({
      userId,
      image,
      mission,
      vision,
      address,
      hours,
      contacts,
      status,
    });

    // 5. Send response
    return res.status(201).json({
      message: "Parks and Recreation content added successfully",
      data: record,
    });
  } catch (error) {
    console.error("Error adding Parks and Recreation content:", error);

    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.updateParksAndRecreationContent = async (req, res) => {
  try {
    const { id, userId, mission, vision, address, hours, contacts, status } =
      req.body;

    if (!id) {
      return res
        .status(400)
        .json({ message: "ID is required", success: false });
    }

    // Find the existing record
    const record = await ParksAndRecreationContent.findByPk(id);

    if (!record) {
      return res
        .status(404)
        .json({ message: "Record not found", success: false });
    }

    // Handle uploaded image
    const imageFile = req.files?.["image"]?.[0] || null;
    const image = imageFile ? imageFile.filename : record.image;

    // Update the record
    await record.update({
      userId,
      image,
      mission,
      vision,
      address,
      hours,
      contacts,
      status,
    });

    return res.status(200).json({
      message: "Parks and Recreation content updated successfully",
      data: record,
      success: true,
    });
  } catch (error) {
    console.error("Error updating Parks and Recreation content:", error);
    return res
      .status(500)
      .json({ message: "Internal server error", success: false });
  }
};

exports.getParksAndRecreationContent = async (req, res) => {
  try {
    const { id } = req.params;
    const baseUrl = `${req.protocol}://${req.get("host")}/images/`;

    // Get category list
    const categoriesRaw = await ParksAndRecreationCategory.findAll({
      include: [
        { model: User, as: "user" },
        {
          model: ParksAndRecreationCategory,
          as: "parent",
          attributes: ["id", "name"],
        },
      ],
      order: [["createdAt", "ASC"]],
    });

    // Add base URL to category image field
    const categories = categoriesRaw.map((cat) => {
      const catData = cat.toJSON();
      catData.image = catData.image ? baseUrl + catData.image : null;
      return catData;
    });

    if (id) {
      const record = await ParksAndRecreationContent.findByPk(id);

      if (!record) {
        return res
          .status(404)
          .json({ message: "Record not found", success: false });
      }

      const recordData = record.toJSON();
      recordData.image = recordData.image ? baseUrl + recordData.image : null;

      return res
        .status(200)
        .json({ data: recordData, categories, success: true });
    }

    const rawRecords = await ParksAndRecreationContent.findAll();

    const records = rawRecords.map((record) => {
      const r = record.toJSON();
      r.image = r.image ? baseUrl + r.image : null;

      return r;
    });

    return res.status(200).json({ data: records, categories, success: true });
  } catch (error) {
    console.error("Error fetching Parks and Recreation content:", error);
    return res
      .status(500)
      .json({ message: "Internal server error", success: false });
  }
};

exports.addParksAndRecreationCategory = async (req, res) => {
  try {
    // 1. Extract token and get userId
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.data.id;

    // 2. Extract category data
    const { name, parentId, status } = req.body;

    if (!name || name.trim() === "") {
      return res.status(400).json({ message: "Category name is required" });
    }

    // 3. Handle optional image upload
    const imageFile = req.files?.["image"]?.[0] || null;
    const image = imageFile ? imageFile.filename : null;

    // 4. Create the category
    const category = await ParksAndRecreationCategory.create({
      userId,
      name,
      image,
      parentId: parentId || null,
      status: status || 1,
    });

    // 5. Send success response
    res.status(201).json({
      message: "Parks and Recreation category created successfully",
      data: category,
    });

  } catch (error) {
    console.error("Error creating category:", error);

    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    res.status(500).json({ message: "Internal server error" });
  }
};

exports.updateParksAndRecreationCategory = async (req, res) => {
  const { id, userId, name, parentId, status } = req.body;

  if (!id) {
    return res.status(400).json({ message: "Category ID is required" });
  }

  if (!name || name.trim() === "") {
    return res.status(400).json({ message: "Category name is required" });
  }

  try {
    const category = await ParksAndRecreationCategory.findByPk(id);

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    // Handle optional image upload
    const imageFile = req.files?.["image"]?.[0] || null;
    const image = imageFile ? imageFile.filename : category.image;

    await category.update({
      userId,
      name,
      image,
      parentId: parentId || null,
      status: status || category.status,
    });

    res.status(200).json({
      message: "Parks and Recreation category updated successfully",
      data: category,
    });
  } catch (error) {
    console.error("Error updating category:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
exports.deleteParksAndRecreationCategory = async (req, res) => {
  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ message: "Category ID is required" });
  }

  try {
    const category = await ParksAndRecreationCategory.findByPk(id);

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    await category.destroy();

    return res.status(200).json({
      message: "Parks and Recreation category deleted successfully",
      success: true,
    });
  } catch (error) {
    console.error("Error deleting category:", error);
    return res
      .status(500)
      .json({ message: "Internal server error", success: false });
  }
};

exports.getAllParksAndRecreationCategories = async (req, res) => {
  try {
    const categories = await ParksAndRecreationCategory.findAll({
      include: [
        { model: User, as: "user" },
        {
          model: ParksAndRecreationCategory,
          as: "parent",
          attributes: ["id", "name"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    return res.status(200).json({
      message: "Parks and Recreation categories fetched successfully",
      data: categories,
      success: true,
    });
  } catch (error) {
    console.error("Error fetching categories:", error);
    return res.status(500).json({
      message: "Internal server error",
      success: false,
    });
  }
};
exports.getParksAndRecreationCategoryById = async (req, res) => {
  const { id } = req.params;

  try {
    const category = await ParksAndRecreationCategory.findByPk(id, {
      include: [
        {
          model: ParksAndRecreationCategory,
          as: "parent",
          attributes: ["id", "name"],
        },
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "email"],
        },
      ],
    });

    if (!category) {
      return res.status(404).json({
        message: "Category not found",
        success: false,
      });
    }

    return res.status(200).json({
      message: "Category fetched successfully",
      data: category,
      success: true,
    });
  } catch (error) {
    console.error("Error fetching category by ID:", error);
    return res.status(500).json({
      message: "Internal server error",
      success: false,
    });
  }
};

exports.addParksAndRecreation = async (req, res) => {
  try {
    // 1. Extract userId from token
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.data.id;

    // 2. Extract data from request body
    const {
      category_id,
      title,
      description,
      shortdescription,
      facilities,
      link,
      date,
      time,
      organizor,
      status,
      published_at,
    } = req.body;

    // 3. Handle file uploads
    const featuredImageFile = req.files?.["featured_image"]?.[0] || null;
    const additionalImages = req.files?.["images"] || [];

    const featured_image = featuredImageFile
      ? featuredImageFile.filename
      : null;
    const images =
      additionalImages.length > 0
        ? additionalImages.map((file) => file.filename).join(",")
        : null;

    // 4. Create the ParksAndRecreation record
    const record = await ParksAndRecreation.create({
      userId,
      category_id,
      title,
      description,
      shortdescription,
      featured_image,
      images,
      facilities,
      link,
      date,
      time,
      organizor,
      status: status || 1,
      published_at,
    });

    try {
      const response = await sendFirebaseNotification({
        title: `New Parks And Recreation  Added: ${title}`,
        body: "A new Parks And Recreation has been published.",
        imageFilename: null,
        type: "custom",
      });
      console.error("Notification Send:", response);

    } catch (notifErr) {
      console.error("Notification Send Error:", notifErr.message);
    }

    // 5. Respond with success
    return res.status(201).json({
      message: "Parks and Recreation content created successfully",
      data: record,
    });

  } catch (error) {
    console.error("Error adding Parks and Recreation content:", error);

    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    return res.status(500).json({ message: "Internal server error" });
  }
};




exports.updateParksAndRecreation = async (req, res) => {
  try {
    const {
      id, // ID of the ParksAndRecreation record to update
      title,
      description,
      shortdescription,
      link,
      category_id,
      date,
      time,
      organizor,
      status,
      existing_images, // JSON string of existing images
      published_at,
      facilities, // JSON string of facilities
    } = req.body;

    // Validate required fields
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "ID is required for update"
      });
    }

    // Find the record by ID
    const park = await ParksAndRecreation.findByPk(id);
    if (!park) {
      return res.status(404).json({
        success: false,
        message: "Parks & Recreation record not found"
      });
    }

    // Helper function to extract filename from URL
    const extractFilename = (img) => {
      if (typeof img !== 'string') return img;
      const urlParts = img.split('/');
      return urlParts[urlParts.length - 1].split('?')[0]; // Remove query params if any
    };

    // Handle featured image
    const featuredImageFile = req.files?.["featured_image"]?.[0] || null;
    const featured_image = featuredImageFile
      ? featuredImageFile.filename
      : park.featured_image;

    // Handle images
    let images = [];

    // 1. Process existing images that weren't removed
    if (existing_images) {
      try {
        const parsedExistingImages = JSON.parse(existing_images);
        if (Array.isArray(parsedExistingImages)) {
          images = parsedExistingImages.map(img => extractFilename(img));
        }
      } catch (e) {
        console.error("Error parsing existing_images", e);
        return res.status(400).json({
          success: false,
          message: "Invalid existing images format"
        });
      }
    }

    // 2. Add new images
    if (req.files?.["images"]) {
      const newImages = req.files["images"].map(file => file.filename);
      images = images.concat(newImages);
    }

    // If no images were provided at all, keep the original ones
    if (images.length === 0 && !req.files?.["images"]) {
      images = park.images ? park.images.split(',') : [];
    }

    // Parse and validate facilities
    let parsedFacilities = [];
    if (facilities) {
      try {
        parsedFacilities = typeof facilities === 'string'
          ? JSON.parse(facilities)
          : facilities;

        if (!Array.isArray(parsedFacilities)) {
          throw new Error("Facilities must be an array");
        }
      } catch (e) {
        console.error("Error parsing facilities", e);
        return res.status(400).json({
          success: false,
          message: "Invalid facilities format"
        });
      }
    } else {
      // Keep existing facilities if none provided
      parsedFacilities = park.facilities
        ? typeof park.facilities === 'string'
          ? JSON.parse(park.facilities)
          : park.facilities
        : [];
    }

    // Update the park record
    const updatedFields = {
      title: title || park.title,
      description: description || park.description,
      shortdescription: shortdescription || park.shortdescription,
      link: link || park.link,
      category_id: category_id || park.category_id,
      date: date || park.date,
      time: time || park.time,
      organizor: organizor || park.organizor,
      status: typeof status !== 'undefined' ? status : park.status,
      published_at: published_at || park.published_at,
      featured_image: featured_image,
      images: images.join(','),
      facilities: JSON.stringify(parsedFacilities)
    };

    await park.update(updatedFields);

    return res.status(200).json({
      success: true,
      message: "Parks & Recreation record updated successfully",
      data: park
    });

  } catch (error) {
    console.error("Error updating Parks & Recreation:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};





// exports.updateParksAndRecreation = async (req, res) => {
//   try {
//     const {
//       id, // ID of the ParksAndRecreation record to update
//       userId,
//       title,
//       description,
//       shortdescription,
//       link,
//       category_id,
//       date,
//       time,
//       organizor,
//       status,
//       published_at,
//       facilities, // JSON string or array
//     } = req.body;

//     // Find the record by ID
//     const park = await ParksAndRecreation.findByPk(id);

//     if (!park) {
//       return res
//         .status(404)
//         .json({ message: "Parks & Recreation record not found" });
//     }

//     // Handle file uploads
//     const featuredImageFile = req.files?.["featured_image"]?.[0] || null;
//     const imagesFiles = req.files?.["images"] || [];

//     // Update fields conditionally
//     if (userId) park.userId = userId;
//     if (title) park.title = title;
//     if (description) park.description = description;
//     if (shortdescription) park.shortdescription = shortdescription;
//     if (link) park.link = link;
//     if (category_id) park.category_id = category_id;
//     if (date) park.date = date;
//     if (time) park.time = time;
//     if (organizor) park.organizor = organizor;
//     if (typeof status !== "undefined") park.status = status;
//     if (published_at) park.published_at = published_at;

//     // Parse facilities JSON if present
//     if (facilities) {
//       park.facilities = facilities;
//     }

//     // Update file paths if uploaded
//     if (featuredImageFile) park.featured_image = featuredImageFile.filename;
//     if (imagesFiles.length > 0)
//       park.images = imagesFiles.map((file) => file.filename).join(",");

//     // Save the updated record
//     await park.save();

//     return res.status(200).json({
//       message: "Parks & Recreation record updated successfully",
//       data: park,
//     });
//   } catch (error) {
//     console.error("Error updating Parks & Recreation:", error);
//     return res.status(500).json({ message: "Internal server error" });
//   }
// };
exports.deleteParksAndRecreationById = async (req, res) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ message: "ID is required" });
    }

    const park = await ParksAndRecreation.findByPk(id);

    if (!park) {
      return res
        .status(404)
        .json({ message: "Parks & Recreation record not found" });
    }

    await park.destroy();

    return res.status(200).json({ message: "Record deleted successfully" });
  } catch (error) {
    console.error("Error deleting record:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
exports.getAllParksAndRecreationByCategoryId = async (req, res) => {
  try {
    const categoryId = parseInt(req.params.categoryId);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const status = req.query.status !== undefined ? req.query.status : 1;

    const baseUrl = `${req.protocol}://${req.get("host")}/images/`;

    const whereClause = {
      category_id: categoryId,
    };

    // Only apply status filter if it's not "all"
    if (status !== "all") {
      whereClause.status = status;
    }

    const { count, rows } = await ParksAndRecreation.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [["published_at", "DESC"]],
      include: [
        {
          model: ParksAndRecreationCategory,
          as: "category",
          attributes: ["id", "name"],
        },
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "email"],
        },
      ],
    });

    const updatedRows = rows.map((item) => {
      const jsonItem = item.toJSON();
      return {
        ...jsonItem,
        featured_image: jsonItem.featured_image
          ? baseUrl + jsonItem.featured_image
          : null,
        images: jsonItem.images
          ? jsonItem.images.split(",").map((filename) => baseUrl + filename)
          : [],
        facilities: jsonItem.facilities
          ? JSON.parse(jsonItem.facilities)
          : null,
      };
    });

    return res.status(200).json({
      success: true,
      message: "Parks and Recreation items fetched successfully",
      data: updatedRows,
      pagination: {
        totalItems: count,
        currentPage: page,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching parks and recreation by category:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
exports.getAllParksAndRecreation = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const { status = 1, keyword = "", category_id = "" } = req.query;

    const baseUrl = `${req.protocol}://${req.get("host")}/images/`;

    // Build main where clause
    const whereClause = {};
    if (status !== "all") {
      whereClause.status = status;
    }

    if (keyword) {
      whereClause[Op.or] = [
        { title: { [Op.like]: `%${keyword}%` } },
        { shortdescription: { [Op.like]: `%${keyword}%` } },
        { description: { [Op.like]: `%${keyword}%` } },
      ];
    }

    // Apply category_id filter directly to the main model
    if (category_id) {
      whereClause.category_id = category_id;
    }

    const { count, rows } = await ParksAndRecreation.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [["published_at", "DESC"]],
      include: [
        {
          model: ParksAndRecreationCategory,
          as: "category",
          attributes: ["id", "name"],
        },
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "email"],
        },
      ],
    });

    const updatedRows = rows.map((item) => {
      const jsonItem = item.toJSON();
      return {
        ...jsonItem,
        featured_image: jsonItem.featured_image
          ? baseUrl + jsonItem.featured_image
          : null,
        images: jsonItem.images
          ? jsonItem.images.split(",").map((filename) => baseUrl + filename)
          : [],
        facilities: jsonItem.facilities
          ? JSON.parse(jsonItem.facilities)
          : null,
      };
    });

    return res.status(200).json({
      success: true,
      message: "Parks and Recreation items fetched successfully",
      data: updatedRows,
      pagination: {
        totalItems: count,
        currentPage: page,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching all parks and recreation:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getAllParksAndRecreationById = async (req, res) => {
  try {
    const { id } = req.params;
    const baseUrl = `${req.protocol}://${req.get("host")}/images/`;

    const item = await ParksAndRecreation.findOne({
      where: { id },
      include: [
        {
          model: ParksAndRecreationCategory,
          as: "category",
          attributes: ["id", "name"],
        },
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "email"],
        },
      ],
    });

    if (!item) {
      return res.status(404).json({ message: "Parks and Recreation item not found" });
    }

    const jsonItem = item.toJSON();
    const updatedItem = {
      ...jsonItem,
      featured_image: jsonItem.featured_image
        ? baseUrl + jsonItem.featured_image
        : null,
      images: jsonItem.images
        ? jsonItem.images.split(",").map((filename) => baseUrl + filename)
        : [],
      facilities: jsonItem.facilities
        ? JSON.parse(jsonItem.facilities)
        : null,
    };

    return res.status(200).json({
      success: true,
      message: "Parks and Recreation item fetched successfully",
      data: updatedItem,
    });
  } catch (error) {
    console.error("Error fetching parks and recreation by ID:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};


// exports.addRecyclingAndGarbageContent = async (req, res) => {
//   try {
//     const {
//       userId,
//       description,
//       shortdescription,
//       status
//     } = req.body;

//     // Get uploaded image file
//     const imageFile = req.files?.['image']?.[0] || null;
//     const image = imageFile ? imageFile.filename : null;

//     // Create the record
//     const record = await RecyclingAndGarbageContent.create({
//       userId,
//       image,
//       description,
//       shortdescription,
//       status
//     });

//     return res.status(201).json({
//       message: 'Recycling and Garbage content added successfully',
//       data: record
//     });
//   } catch (error) {
//     console.error('Error adding Recycling and Garbage content:', error);
//     return res.status(500).json({ message: 'Internal server error' });
//   }
// };
exports.addRecyclingAndGarbageContent = async (req, res) => {
  try {
    // 1. Extract userId from token
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.data.id;

    // 2. Extract other fields from request body
    const { description, shortdescription, status } = req.body;

    // 3. Get uploaded image file
    const imageFile = req.files?.["image"]?.[0] || null;
    const image = imageFile ? imageFile.filename : null;

    // 4. Check if a record already exists
    const existingRecord = await RecyclingAndGarbageContent.findOne();

    if (existingRecord) {
      // Update existing record
      existingRecord.userId = userId;
      existingRecord.description = description || existingRecord.description;
      existingRecord.shortdescription = shortdescription || existingRecord.shortdescription;
      existingRecord.status = typeof status !== "undefined" ? status : existingRecord.status;
      if (image) existingRecord.image = image;

      await existingRecord.save();

      return res.status(200).json({
        message: "Recycling and Garbage content updated successfully",
        data: existingRecord,
      });
    } else {
      // Create new record
      const newRecord = await RecyclingAndGarbageContent.create({
        userId,
        image,
        description,
        shortdescription,
        status,
      });

      return res.status(201).json({
        message: "Recycling and Garbage content added successfully",
        data: newRecord,
      });
    }
  } catch (error) {
    console.error("Error adding/updating Recycling and Garbage content:", error);

    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.updateRecyclingAndGarbageContent = async (req, res) => {
  try {
    // 1. Extract userId from token
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.data.id;

    // 2. Extract other fields from request body
    const {
      id, // ID of the record to update
      description,
      shortdescription,
      status,
    } = req.body;

    // 3. Find the existing record
    const record = await RecyclingAndGarbageContent.findByPk(id);
    if (!record) {
      return res.status(404).json({ message: "Content not found" });
    }

    // 4. Handle uploaded image if any
    const imageFile = req.files?.["image"]?.[0] || null;
    const image = imageFile ? imageFile.filename : null;

    // 5. Update fields
    record.userId = userId;
    if (description) record.description = description;
    if (shortdescription) record.shortdescription = shortdescription;
    if (typeof status !== "undefined") record.status = status;
    if (image) record.image = image;

    // 6. Save changes
    await record.save();

    return res.status(200).json({
      message: "Recycling and Garbage content updated successfully",
      data: record,
    });
  } catch (error) {
    console.error("Error updating Recycling and Garbage content:", error);

    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.deleteRecyclingAndGarbageContent = async (req, res) => {
  try {
    const { id } = req.body;

    // Find record
    const record = await RecyclingAndGarbageContent.findByPk(id);
    if (!record) {
      return res.status(404).json({ message: "Content not found" });
    }

    // Delete record
    await record.destroy();

    return res.status(200).json({
      message: "Recycling and Garbage content deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting Recycling and Garbage content:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.getRecyclingAndGarbageContent = async (req, res) => {
  try {
    const baseUrl = `${req.protocol}://${req.get("host")}/images/`;

    const content = await RecyclingAndGarbageContent.findOne();

    if (!content) {
      return res.status(404).json({ message: "Content not found" });
    }

    // Add full image path if image exists
    const result = {
      ...content.toJSON(),
      image: content.image ? baseUrl + content.image : null,
    };

    return res.status(200).json({
      message: "Recycling and Garbage content fetched successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error fetching Recycling and Garbage content:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.addRecyclingAndGarbage = async (req, res) => {
  try {
    // Extract token from Authorization header
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    // Verify and decode token
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.data.id;

    const { title, description, shortdescription, status } = req.body;

    // File handling
    const imageFile = req.files?.["image"]?.[0] || null;
    const image = imageFile ? imageFile.filename : null;

    // Create the RecyclingAndGarbage record
    const record = await RecyclingAndGarbage.create({
      userId,
      title,
      image,
      description,
      shortdescription,
      status: status || 1,
    });

    try {
      const response = await sendFirebaseNotification({
        title: `New Recycling And Garbage Data Added: ${title}`,
        body: "A new  Recycling And Garbage Data has been published.",
        imageFilename: null,
        type: "custom",
      });
      console.error("Notification Send:", response);

    } catch (notifErr) {
      console.error("Notification Send Error:", notifErr.message);
    }

    return res.status(201).json({
      message: "Recycling and Garbage content created successfully",
      data: record,
    });
  } catch (error) {
    console.error("Error adding Recycling and Garbage content:", error);
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.updateRecyclingAndGarbage = async (req, res) => {
  try {
    const { id, title, description, shortdescription, status } = req.body;

    // Extract token from Authorization header
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    // Verify and decode token
    const decoded = jwt.verify(token, JWT_SECRET);
    const userIdFromToken = decoded.data.id;

    const record = await RecyclingAndGarbage.findByPk(id);
    if (!record) {
      return res.status(404).json({ message: "Record not found" });
    }

    const imageFile = req.files?.["image"]?.[0] || null;
    const image = imageFile ? imageFile.filename : record.image;

    // Update fields, use userId from token
    record.userId = userIdFromToken || record.userId;
    record.title = title || record.title;
    record.description = description || record.description;
    record.shortdescription = shortdescription || record.shortdescription;
    record.status = typeof status !== "undefined" ? status : record.status;
    record.image = image;

    await record.save();

    return res.status(200).json({
      message: "Recycling and Garbage content updated successfully",
      data: record,
    });
  } catch (error) {
    console.error("Error updating Recycling and Garbage content:", error);
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
    return res.status(500).json({ message: "Internal server error" });
  }
};
exports.deleteRecyclingAndGarbage = async (req, res) => {
  try {
    const { id } = req.body;

    const record = await RecyclingAndGarbage.findByPk(id);
    if (!record) {
      return res.status(404).json({ message: "Record not found" });
    }

    await record.destroy();

    return res.status(200).json({ message: "Record deleted successfully" });
  } catch (error) {
    console.error("Error deleting Recycling and Garbage content:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
exports.getAllRecyclingAndGarbage = async (req, res) => {
  try {
    const { keyword = "", status = 1 } = req.query;
    const baseUrl = `${req.protocol}://${req.get("host")}/images/`;

    // Main where clause
    const whereClause = {};
    if (status !== "all") {
      whereClause.status = status;
    }

    if (keyword) {
      whereClause[Op.or] = [
        { title: { [Op.like]: `%${keyword}%` } },
        { description: { [Op.like]: `%${keyword}%` } },
      ];
    }

    const records = await RecyclingAndGarbage.findAll({
      where: whereClause,
      order: [["createdAt", "DESC"]]

    });

    const updatedRecords = records.map((record) => ({
      ...record.toJSON(),
      image: record.image ? baseUrl + record.image : null,
    }));

    return res.status(200).json({
      message: "Recycling and Garbage content fetched successfully",
      data: updatedRecords,
    });
  } catch (error) {
    console.error("Error fetching Recycling and Garbage content:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};



exports.getRecyclingAndGarbageById = async (req, res) => {
  try {
    const { id } = req.params;

    const record = await RecyclingAndGarbage.findByPk(id);

    if (!record) {
      return res.status(404).json({
        message: "Recycling and Garbage content not found",
      });
    }

    const baseUrl = `${req.protocol}://${req.get("host")}/images/`;

    const updatedRecord = {
      ...record.toJSON(),
      image: record.image ? baseUrl + record.image : null,
    };

    return res.status(200).json({
      message: "Recycling and Garbage content fetched successfully",
      data: updatedRecord,
    });
  } catch (error) {
    console.error("Error fetching Recycling and Garbage content by ID:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.addPagesCategory = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || name.trim() === "") {
      return res.status(400).json({ message: "Category name is required" });
    }

    // Extract token from Authorization header
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    // Verify and decode token to get userId
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.data.id;

    const category = await PagesCategory.create({ userId, name });
    console.log(category);
    res.status(201).json({
      message: "Pages category created successfully",
      data: category,
    });
  } catch (error) {
    console.error("Error creating pages category:", error);
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.updatePagesCategory = async (req, res) => {
  try {
    const { id, name, status } = req.body;

    const category = await PagesCategory.findByPk(id);

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    // Update fields
    if (name) category.name = name;
    if (typeof status !== "undefined") category.status = status;

    await category.save();

    res.status(200).json({
      message: "Category updated successfully",
      data: category,
    });
  } catch (error) {
    console.error("Error updating category:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.deletePagesCategory = async (req, res) => {
  try {
    const { id } = req.body;

    const category = await PagesCategory.findByPk(id);

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    await category.destroy();

    res.status(200).json({ message: "Category deleted successfully" });
  } catch (error) {
    console.error("Error deleting category:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
exports.getAllPagesCategories = async (req, res) => {
  try {
    const categories = await PagesCategory.findAll();

    res.status(200).json({
      message: "Active categories fetched successfully",
      data: categories,
    });
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.addPages = async (req, res) => {
  try {
    // Extract token
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token provided" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.data.id;

    const {
      title,
      description,
      shortdescription,
      category_id,
      name,
      designation,
      address,
      contacts,
      hours,
      status,
      undeletable,
      published_at,
    } = req.body;

    // Process files
    const fileMap = {};
    req.files?.forEach(file => {
      if (!fileMap[file.fieldname]) fileMap[file.fieldname] = [];
      fileMap[file.fieldname].push(file);
    });

    const featuredImageFile = fileMap["featured_image"]?.[0] || null;
    const imagesFiles = fileMap["images"] || [];

    const featured_image = featuredImageFile ? featuredImageFile.filename : null;
    const images = imagesFiles.length > 0 ? imagesFiles.map(f => f.filename).join(",") : null;

    // Handle dynamic council members with designation
    const council_members = [];
    let index = 0;
    while (true) {
      const memberName = req.body[`council_name_${index}`];
      const memberDesignation = req.body[`council_designation_${index}`];
      const memberImage = fileMap[`council_image_${index}`]?.[0]?.filename;

      if (!memberName && !memberDesignation && !memberImage) break;

      council_members.push({
        name: memberName || null,
        designation: memberDesignation || null,
        image: memberImage || null,
      });

      index++;
    }

    // Save record
    const page = await Pages.create({
      userId,
      title,
      description,
      shortdescription,
      featured_image,
      images,
      category_id,
      name,
      designation,
      counsil_members: JSON.stringify(council_members),
      address,
      contacts,
      hours,
      status,
      undeletable,
      published_at,
    });
    try {
      const response = await sendFirebaseNotification({
        title: `New Page Added: ${title}`,
        body: "A new page has been published.",
        imageFilename: null,
        type: "custom",
      });
      console.error("Notification Send:", response);

    } catch (notifErr) {
      console.error("Notification Send Error:", notifErr.message);
    }
    return res.status(201).json({
      message: "Page added successfully",
      data: page,
    });
  } catch (error) {
    console.error("Error adding page:", error);
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
    return res.status(500).json({ message: "Internal server error" });
  }
};








exports.updatePages = async (req, res) => {
  try {
    // Authentication and Authorization
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided"
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userIdFromToken = decoded.data.id;

    // Input validation
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Page ID is required"
      });
    }

    // Find the page
    const page = await Pages.findByPk(id);
    if (!page) {
      return res.status(404).json({
        success: false,
        message: "Page not found"
      });
    }

    // Helper function to extract filename from URL
    const extractFilename = (img) => {
      if (typeof img !== 'string') return img;
      const urlParts = img.split('/');
      return urlParts[urlParts.length - 1].split('?')[0];
    };

    // Process files
    const fileMap = {};
    if (req.files) {
      req.files.forEach(file => {
        if (!fileMap[file.fieldname]) fileMap[file.fieldname] = [];
        fileMap[file.fieldname].push(file);
      });
    }

    // Handle featured image
    const featuredImageFile = req.files?.["featured_image"]?.[0] || null;
    const featured_image = featuredImageFile
      ? featuredImageFile.filename
      : page.featured_image;


    // Handle gallery images
    let images = [];

    // Process existing images
    if (req.body.existing_images) {
      try {
        const parsedExistingImages = JSON.parse(req.body.existing_images);
        if (Array.isArray(parsedExistingImages)) {
          images = parsedExistingImages.map(img => extractFilename(img));
        }
      } catch (e) {
        console.error("Error parsing existing_images", e);
        return res.status(400).json({
          success: false,
          message: "Invalid existing images format"
        });
      }
    }

    // Add new images
    if (fileMap["images"]?.length > 0) {
      const newImages = fileMap["images"].map(file => file.filename);
      images = images.concat(newImages);
    }

    // Fallback to original images if none provided
    if (images.length === 0 && !fileMap["images"]) {
      images = page.images ? page.images.split(',') : [];
    }

    // Process council members
    const council_members = [];
    let i = 0;
    while (true) {
      const memberName = req.body[`council_name_${i}`];
      const memberDesignation = req.body[`council_designation_${i}`];
      const memberImageFile = fileMap[`council_image_${i}`]?.[0];
      const memberImageUrl = req.body[`council_image_url_${i}`];

      if (!memberName && !memberDesignation && !memberImageFile && !memberImageUrl) break;

      council_members.push({
        name: memberName || null,
        designation: memberDesignation || null,
        image: memberImageFile
          ? memberImageFile.filename
          : memberImageUrl
            ? extractFilename(memberImageUrl)
            : null,
      });
      i++;
    }

    // Prepare update data
    const updateData = {
      userId: userIdFromToken,
      title: req.body.title || page.title,
      description: req.body.description || page.description,
      shortdescription: req.body.shortdescription || page.shortdescription,
      category_id: req.body.category_id || page.category_id,
      name: req.body.name || page.name,
      designation: req.body.designation || page.designation,
      address: req.body.address || page.address,
      contacts: req.body.contacts || page.contacts,
      hours: req.body.hours || page.hours,
      status: typeof req.body.status !== 'undefined' ? req.body.status : page.status,
      undeletable: typeof req.body.undeletable !== 'undefined' ? req.body.undeletable : page.undeletable,
      published_at: req.body.published_at || page.published_at,
      featured_image: featured_image,
      images: images.join(','),
      council_members: council_members.length > 0 ? JSON.stringify(council_members) : page.council_members
    };

    // Update the page
    await page.update(updateData);

    return res.status(200).json({
      success: true,
      message: "Page updated successfully",
      data: page
    });

  } catch (error) {
    console.error("Error updating page:", error);

    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token"
      });
    }

    if (error.name === "SequelizeValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: error.errors.map(err => err.message)
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// exports.deletePages = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const page = await Pages.findByPk(id);

//     if (!page) {
//       return res.status(404).json({ message: 'Page not found' });
//     }

//     await page.destroy();

//     return res.status(200).json({
//       message: 'Page deleted successfully',
//     });
//   } catch (error) {
//     console.error('Error deleting page:', error);
//     return res.status(500).json({ message: 'Internal server error' });
//   }
// };

exports.deletePages = async (req, res) => {
  try {
    const { id } = req.body;

    // Find the news article
    const page = await Pages.findByPk(id);

    if (!page) {
      return res.status(404).json({ message: "page not found" });
    }

    // Delete the news article
    await page.destroy();

    return res.status(200).json({ message: "page deleted successfully" });
  } catch (error) {
    console.error("Error deleting news:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.getAllPages = async (req, res) => {
  try {
    const baseUrl = `${req.protocol}://${req.get("host")}/images/`;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const { keyword = "", category_id = "", status = 1 } = req.query;

    const whereClause = {};
    if (status !== "all") {
      whereClause.status = status;
    }

    // Keyword filter (title, description, shortdescription)
    if (keyword) {
      whereClause[Op.or] = [
        { title: { [Op.like]: `%${keyword}%` } },
        { description: { [Op.like]: `%${keyword}%` } },
        { shortdescription: { [Op.like]: `%${keyword}%` } },
      ];
    }

    // Add category_id directly to the main whereClause
    if (category_id) {
      whereClause.category_id = category_id;
    }

    const { count, rows } = await Pages.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [["createdAt", "DESC"]],
      include: [
        {
          model: PagesCategory,
          as: "category",
          attributes: ["id", "name"],
        },
      ],
    });

    const updatedPages = rows.map((page) => {
      const jsonPage = page.toJSON();

      jsonPage.featured_image = jsonPage.featured_image
        ? baseUrl + jsonPage.featured_image
        : null;

      jsonPage.images = jsonPage.images
        ? jsonPage.images.split(",").map((img) => baseUrl + img)
        : [];

      try {
        const councilMembers = JSON.parse(jsonPage.counsil_members || "[]");
        jsonPage.counsil_members = councilMembers.map((member) => ({
          ...member,
          image: member.image ? baseUrl + member.image : null,
        }));
      } catch (e) {
        jsonPage.counsil_members = [];
      }

      return jsonPage;
    });

    return res.status(200).json({
      success: true,
      message: "Pages fetched successfully",
      data: updatedPages,
      pagination: {
        totalItems: count,
        currentPage: page,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching pages:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};


exports.getPageById = async (req, res) => {
  try {
    const { id } = req.params; // page ID from route parameter
    const baseUrl = `${req.protocol}://${req.get("host")}/images/`;

    const page = await Pages.findByPk(id, {
      include: [
        {
          model: PagesCategory,
          as: "category",
          attributes: ["id", "name"],
        },
      ],
    });

    if (!page) {
      return res.status(404).json({ message: "Page not found" });
    }

    const jsonPage = page.toJSON();

    // Format featured image and gallery images
    jsonPage.featured_image = jsonPage.featured_image
      ? baseUrl + jsonPage.featured_image
      : null;

    jsonPage.images = jsonPage.images
      ? jsonPage.images.split(",").map((img) => baseUrl + img)
      : [];

    // Format council members with full image path
    try {
      const councilMembers = JSON.parse(jsonPage.counsil_members || "[]");
      jsonPage.counsil_members = councilMembers.map((member) => ({
        ...member,
        image: member.image ? baseUrl + member.image : null,
      }));
    } catch (e) {
      jsonPage.counsil_members = [];
    }

    return res.status(200).json({
      message: "Page fetched successfully",
      data: jsonPage,
    });
  } catch (error) {
    console.error("Error fetching page:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};


exports.getAllPagesByCategoryId = async (req, res) => {
  try {
    const categoryId = parseInt(req.params.categoryId);
    const baseUrl = `${req.protocol}://${req.get("host")}/images/`;

    const pages = await Pages.findAll({
      where: {
        category_id: categoryId,
      },
      order: [["createdAt", "ASC"]],
      include: [
        {
          model: PagesCategory,
          as: "category",
          attributes: ["id", "name"],
        },
      ],
    });

    const updatedPages = pages.map((page) => {
      const pageData = page.toJSON();

      // Handle featured_image
      pageData.featured_image = pageData.featured_image
        ? baseUrl + pageData.featured_image
        : null;

      // Handle images array
      pageData.images = pageData.images
        ? pageData.images.split(",").map((img) => baseUrl + img)
        : [];

      // Decode council_members JSON and add base URL to each image
      try {
        if (pageData.counsil_members) {
          const members = JSON.parse(pageData.counsil_members);
          pageData.counsil_members = members.map((member) => ({
            ...member,
            image: member.image ? baseUrl + member.image : null,
          }));
        }
      } catch (err) {
        console.warn(
          `Failed to parse counsil_members for page id ${pageData.id}`
        );
        pageData.counsil_members = [];
      }

      return pageData;
    });

    return res.status(200).json({
      message: "Pages fetched successfully",
      data: updatedPages,
    });
  } catch (error) {
    console.error("Error fetching pages by category:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.sendContactForm = async (req, res) => {
  try {
    const { subject, name, email, phone, message } = req.body;

    if (!name || !email || !message) {
      return res
        .status(400)
        .json({ message: "Name, email and message are required" });
    }

    // Set up transporter (use your real SMTP config)
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const mailOptions = {
      from: `"${name}" <${process.env.SMTP_USER}>`,
      replyTo: email,
      to: process.env.ADMIN_EMAIL,
      subject: "New Contact Form Submission",
      text: `
    Contact Form Details
    Subject: ${subject}
    Name: ${name}
    Email: ${email}
    Phone: ${phone || "N/A"}
    Message: ${message}
  `,
      html: `
    <h3>Contact Form Details</h3>
     <p><strong>Subject:</strong> ${subject}</p>
    <p><strong>Name:</strong> ${name}</p>
    <p><strong>Email:</strong> ${email}</p>
    <p><strong>Phone:</strong> ${phone || "N/A"}</p>
    <p><strong>Message:</strong><br>${message}</p>
  `,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: "Contact form submitted successfully" });
  } catch (error) {
    console.error("Error sending contact form:", error);
    res.status(500).json({ message: "Failed to send contact form" });
  }
};
// controllers/apiController.js





exports.getDashboardData = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const { id, name, email, role } = decoded.data;

    const [jobCount, newsCount, eventCount, latestJobs, latestNews, latestEvents] = await Promise.all([
      Jobs.count(),
      News.count(),
      Events.count(),
      Jobs.findAll({ limit: 10, order: [['createdAt', 'DESC']] }),
      News.findAll({ limit: 10, order: [['createdAt', 'DESC']] }),
      Events.findAll({ limit: 10, order: [['createdAt', 'DESC']] }),
    ]);

    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];

    const currentYear = new Date().getFullYear();

    const getMonthlyStats = async (Model) => {
      const rawData = await Model.findAll({
        attributes: [
          [sequelize.literal("DATE_FORMAT(createdAt, '%b')"), "month"],
          [sequelize.fn("MONTH", sequelize.col("createdAt")), "monthIndex"],
          [sequelize.fn("COUNT", sequelize.col("id")), "count"]
        ],
        where: sequelize.where(
          sequelize.fn("YEAR", sequelize.col("createdAt")),
          currentYear
        ),
        group: [sequelize.literal("MONTH(createdAt)")],
        raw: true,
      });

      const rawMap = {};
      rawData.forEach(item => {
        rawMap[item.month] = parseInt(item.count);
      });

      return months.map(month => ({
        month,
        year: currentYear,
        count: rawMap[month] || 0
      }));
    };

    const [jobStats, newsStats, eventStats] = await Promise.all([
      getMonthlyStats(Jobs),
      getMonthlyStats(News),
      getMonthlyStats(Events),
    ]);

    return res.status(200).json({
      message: "Dashboard data fetched successfully",
      user: { id, name, email, role },
      data: {
        counts: {
          jobCount,
          newsCount,
          eventCount,
        },
        latest: {
          jobs: latestJobs,
          news: latestNews,
          events: latestEvents,
        },
        monthlyStats: {
          jobs: jobStats,
          news: newsStats,
          events: eventStats,
        }
      }
    });
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.sendNotification = async (req, res) => {
  try {
    const { title, body } = req.body;
    const imageFile = req.files?.find(file => file.fieldname === "image");

    if (!title || !body) {
      return res.status(400).json({ message: "Title and body are required" });
    }

    let imageUrl = null;
    let imageFilename = null;

    if (imageFile) {
      imageFilename = imageFile.filename;
      imageUrl = `${req.protocol}://${req.get("host")}/images/${imageFilename}`;
    }

    const response = await sendFirebaseNotification({
      req: req,
      title: title,
      body: body,
      imageFilename: imageFilename,
      type: 'custom'
    });

    res.json({
      success: true,
      message: "Notification sent to all users",
      firebaseResponse: response,
      imageFilename,
    });
  } catch (error) {
    console.error("Notification Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getAllNotifications = async (req, res) => {
  try {
    const baseUrl = `${req.protocol}://${req.get("host")}/images/`;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const { keyword = "", status = 1 } = req.query;

    const whereClause = {};
    if (status !== "all") {
      whereClause.status = status;
    }

    if (keyword) {
      whereClause[Op.or] = [
        { title: { [Op.like]: `%${keyword}%` } },
        { body: { [Op.like]: `%${keyword}%` } },
        { type: { [Op.like]: `%${keyword}%` } },
      ];
    }

    const { count, rows } = await Notifications.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [["createdAt", "DESC"]],
    });

    const updatedNotifications = rows.map((item) => {
      const jsonItem = item.toJSON();
      jsonItem.image = jsonItem.image ? baseUrl + jsonItem.image : null;
      return jsonItem;
    });

    return res.status(200).json({
      success: true,
      message: "Notifications fetched successfully",
      data: updatedNotifications,
      pagination: {
        totalItems: count,
        currentPage: page,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.addRole = async (req, res) => {
  try {
    // Token auth (optional - based on your app)
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token provided" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.data.id;

    const { role, permissions, status } = req.body;

    // Basic validation
    if (!role || !permissions) {
      return res.status(400).json({ message: "Role and permissions are required" });
    }

    // Create new role
    const newRole = await Roles.create({
      role,
      permissions
    });

    return res.status(201).json({
      message: "Role added successfully",
      data: newRole,
    });
  } catch (error) {
    console.error("Error adding role:", error);
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({ message: "Role with the same permissions already exists" });
    }
    return res.status(500).json({ message: "Internal server error" });
  }
};
exports.updateRole = async (req, res) => {
  try {
    const { id, role, permissions, status } = req.body;

    if (!id) {
      return res.status(400).json({ message: "Role ID is required" });
    }

    // Find existing role
    const existingRole = await Roles.findByPk(id);
    if (!existingRole) {
      return res.status(404).json({ message: "Role not found" });
    }

    // Update fields
    existingRole.role = role || existingRole.role;
    existingRole.permissions = permissions || existingRole.permissions;
    existingRole.status = status !== undefined ? status : existingRole.status;

    await existingRole.save();

    return res.status(200).json({
      message: "Role updated successfully",
      data: existingRole,
    });
  } catch (error) {
    console.error("Error updating role:", error);
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({ message: "Permissions must be unique" });
    }
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.deleteRole = async (req, res) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ message: "Role ID is required" });
    }

    const role = await db.Roles.findByPk(id);
    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }

    await role.destroy();

    return res.status(200).json({ message: "Role deleted successfully" });
  } catch (error) {
    console.error("Error deleting role:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.getAllRoles = async (req, res) => {
  try {
    const roles = await Roles.findAll();

    res.status(200).json({
      success: true,
      message: "Roles fetched successfully",
      data: roles,
    });
  } catch (error) {
    console.error("Error fetching roles:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


exports.getApiDocumentation = (req, res) => {
  const documentation = {
    authentication: {
      login: {
        method: "POST",
        path: "/auth/login",
        bodyParams: ["email", "password"],
      },
      forgotPassword: {
        method: "POST",
        path: "/auth/forgotPassword",
        bodyParams: ["email"],
      },
    },
    users: {
      getUsers: { method: "GET", path: "/auth/users", auth: true },
      getUnicUsers: { method: "GET", path: "/auth/unicusers", auth: true },
      insertUser: { method: "POST", path: "/auth/insertuser", auth: true },
      getAuthUser: { method: "GET", path: "/auth/getauthuser", auth: true },
      updateAuthUser: {
        method: "POST",
        path: "/auth/updateAuthUser",
        auth: true,
      },
      updatePassword: {
        method: "POST",
        path: "/auth/updatePassword",
        auth: true,
      },
      uploadProfilePic: {
        method: "POST",
        path: "/auth/uploadProfilePic",
        auth: true,
        multipart: true,
      },
    },
    newsCategory: {
      add: { method: "POST", path: "/auth/addnewscategory", auth: true },
      getAll: { method: "GET", path: "/auth/getallnewscategory" },
      update: { method: "POST", path: "/auth/updatenewscategory", auth: true },
      delete: { method: "POST", path: "/auth/deletenewscategory", auth: true },
    },
    news: {
      add: {
        method: "POST",
        path: "/auth/addnews",
        auth: true,
        multipart: true,
      },
      update: { method: "POST", path: "/auth/updatenews", auth: true },
      delete: { method: "POST", path: "/auth/deletenews", auth: true },
      getAll: { method: "GET", path: "/auth/getallnews" },
    },
    jobCategory: {
      add: { method: "POST", path: "/auth/addjobcategory", auth: true },
      getAll: { method: "GET", path: "/auth/getalljobcategory" },
      update: { method: "POST", path: "/auth/updatejobcategory", auth: true },
      delete: { method: "POST", path: "/auth/deletejobcategory", auth: true },
    },
    jobs: {
      add: {
        method: "POST",
        path: "/auth/addjob",
        auth: true,
        multipart: true,
      },
      update: { method: "POST", path: "/auth/updatejob", multipart: true },
      delete: { method: "POST", path: "/auth/deletejob", auth: true },
      getAll: { method: "GET", path: "/auth/getalljobs" },
    },
    eventCategory: {
      add: { method: "POST", path: "/auth/addeventcategory", auth: true },
      update: { method: "POST", path: "/auth/updateeventcategory", auth: true },
      delete: { method: "POST", path: "/auth/deleteeventcategory", auth: true },
      getAll: { method: "GET", path: "/auth/getalleventcategory" },
    },
    events: {
      add: {
        method: "POST",
        path: "/auth/addevent",
        auth: true,
        multipart: true,
      },
      update: { method: "POST", path: "/auth/updateevent", multipart: true },
      delete: { method: "POST", path: "/auth/deleteevent", auth: true },
      getAll: { method: "GET", path: "/auth/getallevents" },
    },
  };

  return res.status(200).json({
    message: "API Documentation",
    documentation,
  });
};
