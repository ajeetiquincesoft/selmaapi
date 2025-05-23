const db = require('../models');
const { User, UserMeta,NewsCategory,News,JobsCategory,Jobs,EventsCategory,Events,ParksAndRecreationContent,ParksAndRecreationCategory,
  ParksAndRecreation,RecyclingAndGarbageContent,RecyclingAndGarbage
} = require('../models');
const jwt = require("jsonwebtoken");
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const JWT_SECRET = process.env.JWT_SECRET;
const { Op } = require('sequelize');
const { sequelize } = require('../models');
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
      include: db.UserMeta
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
    const { name, role, password, email, profile_pic, address, phone, gender } = req.query;
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
      profile_pic,
      gender,
    });
    res.json({ message: "Data Insert Successfully", success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email });
    if (!user) {
      return res.status(400).json({ message: 'User not valid' });
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Invalid password' });
    }

    const payload = {
      data: user
    };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
    res.json({ payload, token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};
exports.getauthuser = async (req, res) => {
  const userId = req.user.userId;
  const user = await db.User.findOne({
    where: { id: userId },
    include: db.UserMeta
  });
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }
  res.json(user);
};
exports.updateAuthUser = async (req, res) => {
  const userId = req.user.userId;
  const { name, role, email, profile_pic, address, phone, gender } = req.query;
  try {
    if (!name || !email || !address || !phone || !gender) {
      return res.status(400).json({ message: 'All fields are required.' });
    }
    const user = await db.User.findOne({ where: { id: userId }, include: db.UserMeta });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.name = name;
    user.email = email;
    user.phone = phone;
    await user.save();

    const userMeta = await db.UserMeta.findOne({ where: { userId: userId } });
    userMeta.address = address;
    userMeta.profile_pic = profile_pic;
    userMeta.gender = gender;
    await userMeta.save();

    res.json({ message: 'User updated successfully', user });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
exports.updatePassword = async (req, res) => {
  const userId = req.user.userId;
  const { password, newpassword } = req.query;
  const user = await db.User.findOne({ where: { id: userId } });
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return res.status(400).json({ message: 'Invalid password' });
  }
  const hashedPassword = await bcrypt.hash(newpassword, 10); // 10 is the salt rounds
  user.password = hashedPassword;
  await user.save();
  res.json({ message: 'User updated successfully', user });
};
exports.forgotPassword = async (req, res) => {
  const { email } = req.query;

  if (!email) return res.status(400).json({ message: 'Email is required' });

  try {
    const user = await db.User.findOne({ where: { email } });

    if (!user) return res.status(404).json({ message: 'User not found with this email' });

    // Generate 6-digit random code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Send email
    const transporter = nodemailer.createTransport({
      service: 'Gmail', // or use your own SMTP
      auth: {
        user: 'blueowlservicesny@gmail.com',
        pass: 'wxywwwwfbiloiosh'
      }
    });

    const mailOptions = {
      from: 'blueowlservicesny@gmail.com',
      to: email,
      subject: 'Password Reset Code',
      html: `<p>Your password reset code is: <b>${resetCode}</b></p>`
    };

    await transporter.sendMail(mailOptions);

    res.json({ message: 'Reset code sent to your email' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong', error: err.message });
  }
};
exports.uploadProfilePic = async (req, res) => {
  const userId = req.user.userId;
  const { profile_pic } = req.body;
  if (!profile_pic) {
    return res.status(400).json({ message: 'No image data provided' });
  }
  try {
    const user = await db.UserMeta.findOne({ where: { userId: userId } });
    const matches = profile_pic.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ message: 'Invalid image format' });
    }
    let ext = matches[1].toLowerCase();
    const base64Data = matches[2];
    if (ext === 'jpeg') ext = 'jpg';
    const fileName = `image_Profile${Date.now()}.${ext}`;
    const filePath = path.join(__dirname, '../images', fileName);
    fs.writeFileSync(filePath, base64Data, 'base64');
    user.profile_pic = fileName;
    await user.save();
    res.json({
      message: 'Profile picture uploaded successfully',
      profile_pic: fileName
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to upload image', error: err.message });
  }


  res.json({ user });
};

exports.addnewscategory =async(req,res)=>{
  const {userId, name } = req.body;

  if (!name || name.trim() === '') {
    return res.status(400).json({ message: 'Category name is required' });
  }

  try {
    const category = await NewsCategory.create({userId, name });
    console.log(category);
    res.status(201).json({
      message: 'News category created successfully',
      data: category
    });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getAllNewsCategories = async (req, res) => {
  try {
    const categories = await NewsCategory.findAll({
      where: { status: 1 }
    });

    res.status(200).json({
      message: 'Active categories fetched successfully',
      data: categories
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.updateNewsCategory = async (req, res) => {
  try {
    const { id, name, status } = req.body;

    const category = await NewsCategory.findByPk(id);

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // Update fields
    if (name) category.name = name;
    if (typeof status !== 'undefined') category.status = status;

    await category.save();

    res.status(200).json({
      message: 'Category updated successfully',
      data: category
    });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.deletenewsCategory = async (req, res) => {
  try {
    const { id } = req.body;

    const category = await NewsCategory.findByPk(id);

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    await category.destroy();

    res.status(200).json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.addNews = async (req, res) => {
  try {
    const {
      userId,
      title,
      description,
      shortdescription,
      category_id,
      status,
      published_at
    } = req.body;

    // Get uploaded files
    const featuredImageFile = req.files['featured_image'] ? req.files['featured_image'][0] : null;
    const imagesFiles = req.files['images'] || [];

    // Prepare fields to save
    const featured_image = featuredImageFile ? featuredImageFile.filename : null;
    const images = imagesFiles.length > 0 ? imagesFiles.map(file => file.filename).join(',') : null;

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
      published_at
    });

    return res.status(201).json({
      message: 'News added successfully',
      data: news
    });
  } catch (error) {
    console.error('Error adding news:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};




exports.getAllNews = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 4;
    const offset = (page - 1) * limit;
    const keyword = req.query.keyword || '';

    const baseUrl = `${req.protocol}://${req.get('host')}/uploads/`;

    const whereCondition = {
      status: 1,
      [Op.or]: [
        { title: { [Op.like]: `%${keyword}%` } },
        { shortdescription: { [Op.like]: `%${keyword}%` } },
        { description: { [Op.like]: `%${keyword}%` } }
      ]
    };

    const { count, rows: news } = await News.findAndCountAll({
      where: keyword ? whereCondition : { status: 1 },
      limit,
      offset,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: NewsCategory,
          as: 'category',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'author',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    // Add full image path
    const updatedNews = news.map(item => {
      return {
        ...item.toJSON(),
        featured_image: item.featured_image ? baseUrl + item.featured_image : null,
        images: item.images
          ? item.images.split(',').map(filename => baseUrl + filename)
          : []
      };
    });

    return res.status(200).json({
      success: updatedNews.length > 0,
      message: updatedNews.length > 0 ? 'News fetched successfully' : 'No news found',
      data: updatedNews,
      pagination: {
        total: count,
        page,
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching news:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};


exports.getNewsById = async (req, res) => {
  try {
    const newsId = req.params.id;

    const baseUrl = `${req.protocol}://${req.get('host')}/uploads/`;

    const news = await News.findOne({
      where: { id: newsId, status: 1 },
      include: [
        {
          model: NewsCategory,
          as: 'category',
          attributes: ['id', 'name'],
        },
        {
          model: User,
          as: 'author',
          attributes: ['id', 'name', 'email'],
        }
      ]
    });

    if (!news) {
      return res.status(404).json({ message: 'News not found' });
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
      } else if (typeof newsData.images === 'string') {
        try {
          imagesArray = JSON.parse(newsData.images);
        } catch {
          imagesArray = newsData.images.split(',');
        }
      }

      newsData.images = imagesArray.map(img => baseUrl + img.trim());
    }

    return res.status(200).json({
      message: 'News details fetched successfully',
      data: newsData
    });

  } catch (error) {
    console.error('Error fetching news details:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};



exports.updateNews = async (req, res) => {
  try {
    // console.log("sdfsdf"+JSON.stringify(req.query));
    const id = req.body.id;

    if (!id) {
      return res.status(400).json({ message: 'ID is required', success: false });
    }

    const {
      title,
      description,
      shortdescription,
      category_id,
      status,
      published_at
    } = req.body;

    // Find existing news
    const news = await News.findByPk(id);

    if (!news) {
      return res.status(404).json({ message: 'News not found', success: false });
    }

    // Handle files
    const featuredImageFile = req.files?.['featured_image']?.[0] || null;
    const imagesFiles = req.files?.['images'] || [];

    const featured_image = featuredImageFile
      ? featuredImageFile.filename
      : news.featured_image;

    const images = imagesFiles.length > 0
      ? imagesFiles.map(file => file.filename).join(',')
      : news.images;

    await news.update({
      title,
      description,
      shortdescription,
      featured_image,
      images,
      category_id,
      status,
      published_at
    });

    return res.status(200).json({
      message: 'News updated successfully',
      data: news,
      success: true
    });

  } catch (error) {
    console.error('Error updating news:', error);
    return res.status(500).json({ message: 'Internal server error', success: false });
  }
};



exports.deleteNews = async (req, res) => {
  try {
    const {id} = req.body;

    // Find the news article
    const news = await News.findByPk(id);

    if (!news) {
      return res.status(404).json({ message: 'News not found' });
    }

    // Delete the news article
    await news.destroy();

    return res.status(200).json({ message: 'News deleted successfully' });
  } catch (error) {
    console.error('Error deleting news:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

exports.addJobsCategory = async (req, res) => {
  const { userId, name } = req.body;

  if (!name || name.trim() === '') {
    return res.status(400).json({ message: 'Job category name is required' });
  }

  try {
    const category = await JobsCategory.create({userId, name });
    console.log(category);
    res.status(201).json({
      message: 'Job category created successfully',
      data: category
    });
  } catch (error) {
    console.error('Error creating job category:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getAllJobsCategories = async (req, res) => {
  try {
    const categories = await JobsCategory.findAll({
      where: { status: 1 },
      include: [
        {
          model: Jobs,
          as: 'jobs',
          where: { status: 1 },
          required: false, // allow categories even if they have 0 active jobs
          attributes: []
        }
      ],
      attributes: {
        include: [
          [
            // Count only jobs with status: 1
            sequelize.literal(`(
              SELECT COUNT(*)
              FROM Jobs AS job
              WHERE job.category_id = JobsCategory.id AND job.status = 1
            )`),
            'totalopenings'
          ]
        ]
      }
    });

    res.status(200).json({
      message: 'Active job categories fetched successfully',
      data: categories
    });
  } catch (error) {
    console.error('Error fetching job categories:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.updateJobsCategory = async (req, res) => {
  try {
    const { id, name, status } = req.body;

    const category = await JobsCategory.findByPk(id);

    if (!category) {
      return res.status(404).json({ message: 'Job category not found' });
    }

    if (name) category.name = name;
    if (typeof status !== 'undefined') category.status = status;

    await category.save();

    res.status(200).json({
      message: 'Job category updated successfully',
      data: category
    });
  } catch (error) {
    console.error('Error updating job category:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
exports.deleteJobsCategory = async (req, res) => {
  try {
    const { id } = req.body;

    const category = await JobsCategory.findByPk(id);

    if (!category) {
      return res.status(404).json({ message: 'Job category not found' });
    }

    await category.destroy();

    res.status(200).json({ message: 'Job category deleted successfully' });
  } catch (error) {
    console.error('Error deleting job category:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
exports.addJob = async (req, res) => {
  try {
    const {
      userId,
      title,
      description,
      shortdescription,
      link,
      apply_link,
      category_id,
      status,
      published_at
    } = req.body;

    const featured_image = req.file ? req.file.filename : null;

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
      published_at
    });

    return res.status(201).json({
      message: 'Job added successfully',
      data: job
    });
  } catch (error) {
    console.error('Error adding job:', error);
    return res.status(500).json({ message: 'Internal server error' });
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
      published_at
    } = req.body;

    // Find existing job
    const job = await Jobs.findByPk(id);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    // Handle uploaded files
    const featuredImageFile = req.files['featured_image'] ? req.files['featured_image'][0] : null;
    const imagesFiles = req.files['images'] || [];

    // Update fields if provided
    job.userId = userId || job.userId;
    job.title = title || job.title;
    job.description = description || job.description;
    job.shortdescription = shortdescription || job.shortdescription;  
    job.link = link || job.link;
    job.apply_link = apply_link || job.apply_link;
    job.category_id = category_id || job.category_id;
    job.status = typeof status !== 'undefined' ? status : job.status;
    job.published_at = published_at || job.published_at;

    if (featuredImageFile) {
      job.featured_image = featuredImageFile.filename;
    }

    if (imagesFiles.length > 0) {
      job.images = imagesFiles.map(file => file.filename).join(',');
    }

    await job.save();

    return res.status(200).json({
      message: 'Job updated successfully',
      data: job
    });

  } catch (error) {
    console.error('Error updating job:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};


exports.getAllJobs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1; // Default to page 1
    const limit = parseInt(req.query.limit) || 10; // Default 10 items per page
    const offset = (page - 1) * limit;

    const baseUrl = `${req.protocol}://${req.get('host')}/uploads/`;

    const { count, rows: jobs } = await Jobs.findAndCountAll({
      where: { status: 1 },
      limit,
      offset,
      order: [['published_at', 'DESC']],
      include: [
        {
          model: JobsCategory,
          as: 'category',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    // Add full image path to featured_image
    const updatedJobs = jobs.map(job => {
      return {
        ...job.toJSON(),
        featured_image: job.featured_image 
          ? baseUrl + job.featured_image 
          : null
      };
    });

    return res.status(200).json({
      success: updatedJobs.length > 0,
      message: updatedJobs.length > 0 ? 'Jobs fetched successfully' : 'No jobs found',
      data: updatedJobs,
      pagination: {
        totalItems: count,
        currentPage: page,
        totalPages: Math.ceil(count / limit)
      }
    });
    
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getJobsByCategoryId = async (req, res) => {
  try {
    const categoryId = parseInt(req.params.categoryId);
    const keyword = req.query.keyword || '';
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const baseUrl = `${req.protocol}://${req.get('host')}/uploads/`;

    const { count, rows: jobs } = await Jobs.findAndCountAll({
      where: {
        status: 1,
        category_id: categoryId,
        [Op.or]: [
          { title: { [Op.like]: `%${keyword}%` } },
          { description: { [Op.like]: `%${keyword}%` } },
          { shortdescription: { [Op.like]: `%${keyword}%` } }
        ]
      },
      limit,
      offset,
      order: [['published_at', 'DESC']],
      include: [
        {
          model: JobsCategory,
          as: 'category',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    const updatedJobs = jobs.map(job => ({
      ...job.toJSON(),
      featured_image: job.featured_image 
        ? baseUrl + job.featured_image 
        : null
    }));

    return res.status(200).json({
      success: updatedJobs.length > 0,
      message: updatedJobs.length > 0 ? 'Jobs fetched successfully' : 'No jobs found for this category',
      data: updatedJobs,
      pagination: {
        totalItems: count,
        currentPage: page,
        totalPages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching jobs by category:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};


exports.getJobById = async (req, res) => {
  try {
    const { id } = req.params;
    const baseUrl = `${req.protocol}://${req.get('host')}/uploads/`;

    const job = await Jobs.findOne({
      where: { id, status: 1 },
      include: [
        {
          model: JobsCategory,
          as: 'category',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    if (!job) return res.status(404).json({ message: 'Job not found' });

    const jobData = job.toJSON();

    // Add full path to featured_image
    jobData.featured_image = jobData.featured_image ? baseUrl + jobData.featured_image : null;

    return res.status(200).json({
      message: 'Job fetched successfully',
      data: jobData
    });

  } catch (error) {
    console.error('Error fetching job by ID:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

exports.deleteJob = async (req, res) => {
  try {
    const { id } = req.body;

    const job = await Jobs.findByPk(id);

    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    await job.destroy();

    return res.status(200).json({ message: 'Job deleted successfully' });
  } catch (error) {
    console.error('Error deleting job:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

exports.addEventsCategory = async (req, res) => {
  const { userId, name } = req.body;

  if (!name || name.trim() === '') {
    return res.status(400).json({ message: 'Event category name is required' });
  }

  try {
    const category = await EventsCategory.create({ userId, name });
    console.log(category);
    res.status(201).json({
      message: 'Event category created successfully',
      data: category
    });
  } catch (error) {
    console.error('Error creating event category:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.updateEventsCategory = async (req, res) => {
  try {
    const { id, name, status } = req.body;

    const category = await EventsCategory.findByPk(id);

    if (!category) {
      return res.status(404).json({ message: 'Event category not found' });
    }

    if (name) category.name = name;
    if (typeof status !== 'undefined') category.status = status;

    await category.save();

    res.status(200).json({
      message: 'Event category updated successfully',
      data: category
    });
  } catch (error) {
    console.error('Error updating event category:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
exports.deleteEventsCategory = async (req, res) => {
  try {
    const { id } = req.body;

    const category = await EventsCategory.findByPk(id);

    if (!category) {
      return res.status(404).json({ message: 'Event category not found' });
    }

    await category.destroy();

    res.status(200).json({ message: 'Event category deleted successfully' });
  } catch (error) {
    console.error('Error deleting event category:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
exports.getAllEventsCategories = async (req, res) => {
  try {
    const categories = await EventsCategory.findAll({
      where: { status: 1 }
    });

    res.status(200).json({
      message: 'Active event categories fetched successfully',
      data: categories
    });
  } catch (error) {
    console.error('Error fetching event categories:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};


exports.addEvent = async (req, res) => {
  try {
    const {
      userId,
      title,
      description,
      shortdescription,
      link,
      category_id,
      date,
      time,
      organizor,
      status,
      published_at
    } = req.body;

    // Get uploaded files
    const featuredImageFile = req.files['featured_image'] ? req.files['featured_image'][0] : null;
    const filesUploads = req.files['files'] || [];

    const featured_image = featuredImageFile ? featuredImageFile.filename : null;
    const files = filesUploads.length > 0 ? filesUploads.map(file => file.filename).join(',') : null;

    // Create the event record
    const event = await Events.create({
      userId,
      title,
      description,
      shortdescription,
      featured_image,
      files,
      link,
      category_id,
      date,
      time,
      organizor,
      status,
      published_at
    });

    return res.status(201).json({
      message: 'Event added successfully',
      data: event
    });
  } catch (error) {
    console.error('Error adding event:', error);
    return res.status(500).json({ message: 'Internal server error' });
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
      date,
      time,
      organizor,
      status,
      published_at
    } = req.body;

    // Find the event by ID
    const event = await Events.findByPk(id);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Get uploaded files
    const featuredImageFile = req.files?.['featured_image']?.[0] || null;
    const filesUploads = req.files?.['files'] || [];

    // Update fields
    if (userId) event.userId = userId;
    if (title) event.title = title;
    if (description) event.description = description;
    if (shortdescription) event.shortdescription = shortdescription;
    if (link) event.link = link;
    if (category_id) event.category_id = category_id;
    if (date) event.date = date;
    if (time) event.time = time;
    if (organizor) event.organizor = organizor;
    if (typeof status !== 'undefined') event.status = status;
    if (published_at) event.published_at = published_at;

    // If new files were uploaded, update paths
    if (featuredImageFile) event.featured_image = featuredImageFile.filename;
    if (filesUploads.length > 0) event.files = filesUploads.map(file => file.filename).join(',');

    // Save changes
    await event.save();

    return res.status(200).json({
      message: 'Event updated successfully',
      data: event
    });

  } catch (error) {
    console.error('Error updating event:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};


exports.deleteEvent = async (req, res) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ message: 'Event ID is required' });
    }

    const event = await Events.findByPk(id);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    await event.destroy();

    return res.status(200).json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error deleting event:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getAllEvents = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const baseUrl = `${req.protocol}://${req.get('host')}/uploads/`;

    const { count, rows: events } = await Events.findAndCountAll({
      where: { status: 1 },
      limit,
      offset,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: EventsCategory,
          as: 'category',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    // Add full URL to featured_image and files
    const updatedEvents = events.map(event => {
      return {
        ...event.toJSON(),
        featured_image: event.featured_image
          ? baseUrl + event.featured_image
          : null,
        files: event.files
          ? event.files.split(',').map(filename => baseUrl + filename)
          : []
      };
    });

    return res.status(200).json({
      success: updatedEvents.length > 0,
      message: updatedEvents.length > 0 ? 'Events fetched successfully' : 'No events found',
      data: updatedEvents,
      pagination: {
        total: count,
        page,
        totalPages: Math.ceil(count / limit)
      }
    });
    
  } catch (error) {
    console.error('Error fetching events:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getEventById = async (req, res) => {
  try {
    const { id } = req.params;
    const baseUrl = `${req.protocol}://${req.get('host')}/uploads/`;

    const event = await Events.findOne({
      where: { id, status: 1 },
      include: [
        {
          model: EventsCategory,
          as: 'category',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    if (!event) return res.status(404).json({ message: 'Event not found' });

    const eventData = event.toJSON();

    // Add full path to featured_image
    eventData.featured_image = eventData.featured_image ? baseUrl + eventData.featured_image : null;

    return res.status(200).json({
      message: 'Event fetched successfully',
      data: eventData
    });

  } catch (error) {
    console.error('Error fetching event by ID:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

exports.addParksAndRecreationContent = async (req, res) => {
  try {
    const {
      userId,
      mission,
      vision,
      address,
      hours,
      contacts,
      status
    } = req.body;

    // Get uploaded image file
    const imageFile = req.files?.['image']?.[0] || null;
    const image = imageFile ? imageFile.filename : null;

    // Create the record
    const record = await ParksAndRecreationContent.create({
      userId,
      image,
      mission,
      vision,
      address,
      hours,
      contacts,
      status
    });

    return res.status(201).json({
      message: 'Parks and Recreation content added successfully',
      data: record
    });
  } catch (error) {
    console.error('Error adding Parks and Recreation content:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

exports.updateParksAndRecreationContent = async (req, res) => {
  try {
    const {
      id,
      userId,
      mission,
      vision,
      address,
      hours,
      contacts,
      status
    } = req.body;

    if (!id) {
      return res.status(400).json({ message: 'ID is required', success: false });
    }

    // Find the existing record
    const record = await ParksAndRecreationContent.findByPk(id);

    if (!record) {
      return res.status(404).json({ message: 'Record not found', success: false });
    }

    // Handle uploaded image
    const imageFile = req.files?.['image']?.[0] || null;
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
      status
    });

    return res.status(200).json({
      message: 'Parks and Recreation content updated successfully',
      data: record,
      success: true
    });

  } catch (error) {
    console.error('Error updating Parks and Recreation content:', error);
    return res.status(500).json({ message: 'Internal server error', success: false });
  }
};


exports.getParksAndRecreationContent = async (req, res) => {
  try {
    const { id } = req.params;

    if (id) {
      const record = await ParksAndRecreationContent.findByPk(id);

      if (!record) {
        return res.status(404).json({ message: 'Record not found', success: false });
      }

      return res.status(200).json({ data: record, success: true });
    }

    // Fetch all records if no ID is passed
    const records = await ParksAndRecreationContent.findAll();
    return res.status(200).json({ data: records, success: true });

  } catch (error) {
    console.error('Error fetching Parks and Recreation content:', error);
    return res.status(500).json({ message: 'Internal server error', success: false });
  }
};

exports.addParksAndRecreationCategory = async (req, res) => {
  const { userId, name, parentId, status } = req.body;

  if (!name || name.trim() === '') {
    return res.status(400).json({ message: 'Category name is required' });
  }

  try {
    // Handle optional image upload
    const imageFile = req.files?.['image']?.[0] || null;
    const image = imageFile ? imageFile.filename : null;

    const category = await ParksAndRecreationCategory.create({
      userId,
      name,
      image,
      parentId: parentId || null,
      status: status || 1
    });

    res.status(201).json({
      message: 'Parks and Recreation category created successfully',
      data: category
    });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.updateParksAndRecreationCategory = async (req, res) => {
  const { id, userId, name, parentId, status } = req.body;

  if (!id) {
    return res.status(400).json({ message: 'Category ID is required' });
  }

  if (!name || name.trim() === '') {
    return res.status(400).json({ message: 'Category name is required' });
  }

  try {
    const category = await ParksAndRecreationCategory.findByPk(id);

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // Handle optional image upload
    const imageFile = req.files?.['image']?.[0] || null;
    const image = imageFile ? imageFile.filename : category.image;

    await category.update({
      userId,
      name,
      image,
      parentId: parentId || null,
      status: status || category.status
    });

    res.status(200).json({
      message: 'Parks and Recreation category updated successfully',
      data: category
    });

  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
exports.deleteParksAndRecreationCategory = async (req, res) => {
  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ message: 'Category ID is required' });
  }

  try {
    const category = await ParksAndRecreationCategory.findByPk(id);

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    await category.destroy();

    return res.status(200).json({
      message: 'Parks and Recreation category deleted successfully',
      success: true
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    return res.status(500).json({ message: 'Internal server error', success: false });
  }
};

exports.getAllParksAndRecreationCategories = async (req, res) => {
  try {
    const categories = await ParksAndRecreationCategory.findAll({
      include: [
        { model: User, as: 'user' },
        {
          model: ParksAndRecreationCategory,
          as: 'parent',
          attributes: ['id', 'name']
        }
      ],
      order: [['createdAt', 'DESC']],
    });

    return res.status(200).json({
      message: 'Parks and Recreation categories fetched successfully',
      data: categories,
      success: true,
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return res.status(500).json({
      message: 'Internal server error',
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
          as: 'parent',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    if (!category) {
      return res.status(404).json({
        message: 'Category not found',
        success: false
      });
    }

    return res.status(200).json({
      message: 'Category fetched successfully',
      data: category,
      success: true
    });
  } catch (error) {
    console.error('Error fetching category by ID:', error);
    return res.status(500).json({
      message: 'Internal server error',
      success: false
    });
  }
};


exports.addParksAndRecreation = async (req, res) => {
  try {
    const {
      userId,
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
      published_at
    } = req.body;

    // File handling
    const featuredImageFile = req.files?.['featured_image']?.[0] || null;
    const additionalImages = req.files?.['images'] || [];

    const featured_image = featuredImageFile ? featuredImageFile.filename : null;
    const images = additionalImages.length > 0 ? additionalImages.map(file => file.filename).join(',') : null;

    // Create the ParksAndRecreation record
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
      published_at
    });

    return res.status(201).json({
      message: 'Parks and Recreation content created successfully',
      data: record
    });
  } catch (error) {
    console.error('Error adding Parks and Recreation content:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};


exports.updateParksAndRecreation = async (req, res) => {
  try {
    const {
      id, // ID of the ParksAndRecreation record to update
      userId,
      title,
      description,
      shortdescription,
      link,
      category_id,
      date,
      time,
      organizor,
      status,
      published_at,
      facilities // JSON string or array
    } = req.body;

    // Find the record by ID
    const park = await ParksAndRecreation.findByPk(id);

    if (!park) {
      return res.status(404).json({ message: 'Parks & Recreation record not found' });
    }

    // Handle file uploads
    const featuredImageFile = req.files?.['featured_image']?.[0] || null;
    const imagesFiles = req.files?.['images'] || [];

    // Update fields conditionally
    if (userId) park.userId = userId;
    if (title) park.title = title;
    if (description) park.description = description;
    if (shortdescription) park.shortdescription = shortdescription;
    if (link) park.link = link;
    if (category_id) park.category_id = category_id;
    if (date) park.date = date;
    if (time) park.time = time;
    if (organizor) park.organizor = organizor;
    if (typeof status !== 'undefined') park.status = status;
    if (published_at) park.published_at = published_at;

    // Parse facilities JSON if present
    if (facilities) {
      park.facilities = facilities;
    }

    // Update file paths if uploaded
    if (featuredImageFile) park.featured_image = featuredImageFile.filename;
    if (imagesFiles.length > 0) park.images = imagesFiles.map(file => file.filename).join(',');

    // Save the updated record
    await park.save();

    return res.status(200).json({
      message: 'Parks & Recreation record updated successfully',
      data: park
    });

  } catch (error) {
    console.error('Error updating Parks & Recreation:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
exports.deleteParksAndRecreationById = async (req, res) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ message: 'ID is required' });
    }

    const park = await ParksAndRecreation.findByPk(id);

    if (!park) {
      return res.status(404).json({ message: 'Parks & Recreation record not found' });
    }

    await park.destroy();

    return res.status(200).json({ message: 'Record deleted successfully' });

  } catch (error) {
    console.error('Error deleting record:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
exports.getAllParksAndRecreationByCategoryId = async (req, res) => {
  try {
    const categoryId = parseInt(req.params.categoryId);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const baseUrl = `${req.protocol}://${req.get('host')}/uploads/`;

    const { count, rows } = await ParksAndRecreation.findAndCountAll({
      where: {
        status: 1,
        category_id: categoryId
      },
      limit,
      offset,
      order: [['published_at', 'DESC']],
      include: [
        {
          model: ParksAndRecreationCategory,
          as: 'category',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    const updatedRows = rows.map(item => ({
      ...item.toJSON(),
      featured_image: item.featured_image ? baseUrl + item.featured_image : null,
      images: item.images
        ? item.images.split(',').map(filename => baseUrl + filename)
        : []
    }));

    return res.status(200).json({
      success: true,
      message: 'Parks and Recreation items fetched successfully',
      data: updatedRows,
      pagination: {
        totalItems: count,
        currentPage: page,
        totalPages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching parks and recreation by category:', error);
    res.status(500).json({ message: 'Internal server error' });
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
    const {
      userId,
      description,
      shortdescription,
      status
    } = req.body;

    // Get uploaded image file
    const imageFile = req.files?.['image']?.[0] || null;
    const image = imageFile ? imageFile.filename : null;

    // Check if a record already exists
    const existingRecord = await RecyclingAndGarbageContent.findOne();

    if (existingRecord) {
      // Update the existing record
      existingRecord.userId = userId || existingRecord.userId;
      existingRecord.description = description || existingRecord.description;
      existingRecord.shortdescription = shortdescription || existingRecord.shortdescription;
      existingRecord.status = typeof status !== 'undefined' ? status : existingRecord.status;
      if (image) existingRecord.image = image;

      await existingRecord.save();

      return res.status(200).json({
        message: 'Recycling and Garbage content updated successfully',
        data: existingRecord
      });
    } else {
      // Create a new record
      const newRecord = await RecyclingAndGarbageContent.create({
        userId,
        image,
        description,
        shortdescription,
        status
      });

      return res.status(201).json({
        message: 'Recycling and Garbage content added successfully',
        data: newRecord
      });
    }
  } catch (error) {
    console.error('Error adding/updating Recycling and Garbage content:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};


exports.updateRecyclingAndGarbageContent = async (req, res) => {
  try {
    const {
      id, // ID of the record to update
      userId,
      description,
      shortdescription,
      status
    } = req.body;

    // Find the existing record
    const record = await RecyclingAndGarbageContent.findByPk(id);
    if (!record) {
      return res.status(404).json({ message: 'Content not found' });
    }

    // Handle uploaded image if any
    const imageFile = req.files?.['image']?.[0] || null;
    const image = imageFile ? imageFile.filename : null;

    // Update fields if provided
    if (userId) record.userId = userId;
    if (description) record.description = description;
    if (shortdescription) record.shortdescription = shortdescription;
    if (typeof status !== 'undefined') record.status = status;
    if (image) record.image = image;

    // Save changes
    await record.save();

    return res.status(200).json({
      message: 'Recycling and Garbage content updated successfully',
      data: record
    });
  } catch (error) {
    console.error('Error updating Recycling and Garbage content:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};


exports.deleteRecyclingAndGarbageContent = async (req, res) => {
  try {
    const { id } = req.body;

    // Find record
    const record = await RecyclingAndGarbageContent.findByPk(id);
    if (!record) {
      return res.status(404).json({ message: 'Content not found' });
    }

    // Delete record
    await record.destroy();

    return res.status(200).json({
      message: 'Recycling and Garbage content deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting Recycling and Garbage content:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getRecyclingAndGarbageContent = async (req, res) => {
  try {
    const baseUrl = `${req.protocol}://${req.get('host')}/uploads/`;

    const content = await RecyclingAndGarbageContent.findOne();

    if (!content) {
      return res.status(404).json({ message: 'Content not found' });
    }

    // Add full image path if image exists
    const result = {
      ...content.toJSON(),
      image: content.image ? baseUrl + content.image : null
    };

    return res.status(200).json({
      message: 'Recycling and Garbage content fetched successfully',
      data: result
    });
  } catch (error) {
    console.error('Error fetching Recycling and Garbage content:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

exports.addRecyclingAndGarbage = async (req, res) => {
  try {
    const {
      userId,
      title,
      description,
      shortdescription,
      status
    } = req.body;

    // File handling
    const imageFile = req.files?.['image']?.[0] || null;
    const image = imageFile ? imageFile.filename : null;

    // Create the RecyclingAndGarbage record
    const record = await RecyclingAndGarbage.create({
      userId,
      title,
      image,
      description,
      shortdescription,
      status: status || 1
    });

    return res.status(201).json({
      message: 'Recycling and Garbage content created successfully',
      data: record
    });
  } catch (error) {
    console.error('Error adding Recycling and Garbage content:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};


exports.updateRecyclingAndGarbage = async (req, res) => {
  try {
    const {
      id,
      userId,
      title,
      description,
      shortdescription,
      status
    } = req.body;

    const record = await RecyclingAndGarbage.findByPk(id);
    if (!record) {
      return res.status(404).json({ message: 'Record not found' });
    }

    const imageFile = req.files?.['image']?.[0] || null;
    const image = imageFile ? imageFile.filename : record.image;

    record.userId = userId || record.userId;
    record.title = title || record.title;
     record.description = description || record.description;
    record.shortdescription = shortdescription || record.shortdescription;
    record.status = typeof status !== 'undefined' ? status : record.status;
    record.image = image;

    await record.save();

    return res.status(200).json({
      message: 'Recycling and Garbage content updated successfully',
      data: record
    });
  } catch (error) {
    console.error('Error updating Recycling and Garbage content:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
exports.deleteRecyclingAndGarbage = async (req, res) => {
  try {
    const { id } = req.body;

    const record = await RecyclingAndGarbage.findByPk(id);
    if (!record) {
      return res.status(404).json({ message: 'Record not found' });
    }

    await record.destroy();

    return res.status(200).json({ message: 'Record deleted successfully' });
  } catch (error) {
    console.error('Error deleting Recycling and Garbage content:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
exports.getAllRecyclingAndGarbage = async (req, res) => {
  try {
    const records = await RecyclingAndGarbage.findAll({
      where: { status: 1 }, // Only fetch active records
      order: [['createdAt', 'DESC']]
    });

    const baseUrl = `${req.protocol}://${req.get('host')}/uploads/`;

    const updatedRecords = records.map(record => ({
      ...record.toJSON(),
      image: record.image ? baseUrl + record.image : null
    }));

    return res.status(200).json({
      message: 'Recycling and Garbage content fetched successfully',
      data: updatedRecords
    });
  } catch (error) {
    console.error('Error fetching Recycling and Garbage content:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getRecyclingAndGarbageById = async (req, res) => {
  try {
    const { id } = req.params;

    const record = await RecyclingAndGarbage.findByPk(id);

    if (!record) {
      return res.status(404).json({
        message: 'Recycling and Garbage content not found'
      });
    }

    const baseUrl = `${req.protocol}://${req.get('host')}/uploads/`;

    const updatedRecord = {
      ...record.toJSON(),
      image: record.image ? baseUrl + record.image : null
    };

    return res.status(200).json({
      message: 'Recycling and Garbage content fetched successfully',
      data: updatedRecord
    });
  } catch (error) {
    console.error('Error fetching Recycling and Garbage content by ID:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};


// controllers/apiController.js

exports.getApiDocumentation = (req, res) => {
  const documentation = {
    authentication: {
      login: { method: 'POST', path: '/auth/login', bodyParams: ['email', 'password'] },
      forgotPassword: { method: 'POST', path: '/auth/forgotPassword', bodyParams: ['email'] }
    },
    users: {
      getUsers: { method: 'GET', path: '/auth/users', auth: true },
      getUnicUsers: { method: 'GET', path: '/auth/unicusers', auth: true },
      insertUser: { method: 'POST', path: '/auth/insertuser', auth: true },
      getAuthUser: { method: 'GET', path: '/auth/getauthuser', auth: true },
      updateAuthUser: { method: 'POST', path: '/auth/updateAuthUser', auth: true },
      updatePassword: { method: 'POST', path: '/auth/updatePassword', auth: true },
      uploadProfilePic: { method: 'POST', path: '/auth/uploadProfilePic', auth: true, multipart: true }
    },
    newsCategory: {
      add: { method: 'POST', path: '/auth/addnewscategory', auth: true },
      getAll: { method: 'GET', path: '/auth/getallnewscategory' },
      update: { method: 'POST', path: '/auth/updatenewscategory', auth: true },
      delete: { method: 'POST', path: '/auth/deletenewscategory', auth: true }
    },
    news: {
      add: { method: 'POST', path: '/auth/addnews', auth: true, multipart: true },
      update: { method: 'POST', path: '/auth/updatenews', auth: true },
      delete: { method: 'POST', path: '/auth/deletenews', auth: true },
      getAll: { method: 'GET', path: '/auth/getallnews' }
    },
    jobCategory: {
      add: { method: 'POST', path: '/auth/addjobcategory', auth: true },
      getAll: { method: 'GET', path: '/auth/getalljobcategory' },
      update: { method: 'POST', path: '/auth/updatejobcategory', auth: true },
      delete: { method: 'POST', path: '/auth/deletejobcategory', auth: true }
    },
    jobs: {
      add: { method: 'POST', path: '/auth/addjob', auth: true, multipart: true },
      update: { method: 'POST', path: '/auth/updatejob', multipart: true },
      delete: { method: 'POST', path: '/auth/deletejob', auth: true },
      getAll: { method: 'GET', path: '/auth/getalljobs' }
    },
    eventCategory: {
      add: { method: 'POST', path: '/auth/addeventcategory', auth: true },
      update: { method: 'POST', path: '/auth/updateeventcategory', auth: true },
      delete: { method: 'POST', path: '/auth/deleteeventcategory', auth: true },
      getAll: { method: 'GET', path: '/auth/getalleventcategory' }
    },
    events: {
      add: { method: 'POST', path: '/auth/addevent', auth: true, multipart: true },
      update: { method: 'POST', path: '/auth/updateevent', multipart: true },
      delete: { method: 'POST', path: '/auth/deleteevent', auth: true },
      getAll: { method: 'GET', path: '/auth/getallevents' }
    }
  };

  return res.status(200).json({
    message: 'API Documentation',
    documentation
  });
};
