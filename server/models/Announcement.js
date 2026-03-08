import mongoose from 'mongoose';

const announcementSchema = new mongoose.Schema({
  enabled: {
    type: Boolean,
    default: false,
  },
  text: {
    type: String,
    default: '',
    trim: true,
    maxlength: 500,
  },
  link: {
    type: String,
    default: '',
    trim: true,
  },
  bgColor: {
    type: String,
    default: '#dc2626',
  },
  textColor: {
    type: String,
    default: '#ffffff',
  },
  scrolling: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

const Announcement = mongoose.model('Announcement', announcementSchema);

/**
 * Get the single announcement document (creates default if missing).
 */
export async function getAnnouncement() {
  let doc = await Announcement.findOne();
  if (!doc) {
    doc = await Announcement.create({});
  }
  return doc;
}

export default Announcement;
