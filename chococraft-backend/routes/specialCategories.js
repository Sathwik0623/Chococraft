const express = require('express');
const router = express.Router();
const SpecialCategory = require('../models/SpecialCategory');

// GET all visible special categories
router.get('/', async (req, res) => {
  try {
    const query = req.query.visible === 'true' ? { isVisible: true } : {};
    const specialCategories = await SpecialCategory.find(query);
    res.json(specialCategories);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch special categories' });
  }
});

// POST a new special category
router.post('/', async (req, res) => {
  try {
    const { name, productIds, isVisible } = req.body;
    const specialCategory = new SpecialCategory({ name, productIds, isVisible });
    await specialCategory.save();
    res.status(201).json(specialCategory);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create special category' });
  }
});

// PUT to update a special category
router.put('/:id', async (req, res) => {
  try {
    const { name, productIds, isVisible } = req.body;
    const specialCategory = await SpecialCategory.findByIdAndUpdate(
      req.params.id,
      { name, productIds, isVisible },
      { new: true }
    );
    if (!specialCategory) {
      return res.status(404).json({ error: 'Special category not found' });
    }
    res.json(specialCategory);
  } catch (error) {
    res.status(400).json({ error: 'Failed to update special category' });
  }
});

// DELETE a special category
router.delete('/:id', async (req, res) => {
  try {
    const specialCategory = await SpecialCategory.findByIdAndDelete(req.params.id);
    if (!specialCategory) {
      return res.status(404).json({ error: 'Special category not found' });
    }
    res.json({ message: 'Special category deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete special category' });
  }
});

// GET a single special category by ID
router.get('/:id', async (req, res) => {
  try {
    const specialCategory = await SpecialCategory.findById(req.params.id);
    if (!specialCategory) {
      return res.status(404).json({ error: 'Special category not found' });
    }
    res.json(specialCategory);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch special category' });
  }
});

module.exports = router;