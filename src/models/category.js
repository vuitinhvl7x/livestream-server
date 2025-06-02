import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";
import slugify from "slugify";

const Category = sequelize.define(
  "Category",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: {
        name: "categories_name_unique",
        msg: "Category name must be unique.",
      },
      validate: {
        notEmpty: {
          msg: "Category name cannot be empty.",
        },
      },
    },
    slug: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: {
        name: "categories_slug_unique",
        msg: "Category slug must be unique.",
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    thumbnailUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    b2ThumbnailFileId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    b2ThumbnailFileName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    tags: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
      defaultValue: [],
    },
    thumbnailUrlExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    // createdAt and updatedAt are managed by timestamps: true in options
  },
  {
    // Options
    sequelize, // This is automatically passed if you define it on the sequelize instance globally, but good to be explicit
    modelName: "Category", // Conventionally, modelName is singular and PascalCase
    tableName: "Categories",
    timestamps: true, // Sequelize will manage createdAt and updatedAt
    hooks: {
      beforeValidate: (category) => {
        if (category.name && !category.slug) {
          category.slug = slugify(category.name, {
            lower: true,
            strict: true,
            remove: /[*+~.()'"!:@]/g,
          });
        } else if (category.slug) {
          // Ensure slug is in correct format if provided directly
          category.slug = slugify(category.slug, {
            lower: true,
            strict: true,
            remove: /[*+~.()'"!:@]/g,
          });
        }
      },
      beforeUpdate: async (category) => {
        if (category.changed("name")) {
          category.slug = slugify(category.name, {
            lower: true,
            strict: true,
            remove: /[*+~.()'"!:@]/g,
          });
        } else if (category.changed("slug") && category.slug) {
          category.slug = slugify(category.slug, {
            lower: true,
            strict: true,
            remove: /[*+~.()'"!:@]/g,
          });
        }
      },
    },
  }
);

export default Category;
