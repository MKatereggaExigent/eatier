#!/bin/bash

# Community Page SCSS Redesign Script
# This script backs up and replaces the community component SCSS with glassmorphic design

COMPONENT_PATH="/Users/michaelkateregga/Documents/GitHub/itiyum/src/app/pages/community"
SCSS_FILE="$COMPONENT_PATH/community.component.scss"
BACKUP_FILE="$COMPONENT_PATH/community.component.scss.backup.$(date +%Y%m%d_%H%M%S)"

echo "🎨 Community Page Glassmorphic Redesign"
echo "========================================"
echo ""

# Create backup
echo "📦 Creating backup..."
cp "$SCSS_FILE" "$BACKUP_FILE"
echo "✅ Backup created: $BACKUP_FILE"
echo ""

# Write new SCSS file
echo "✨ Writing new glassmorphic SCSS..."

cat > "$SCSS_FILE" << 'SCSS_CONTENT'
// Community Page - Glassmorphic Monochrome Design
// Generated: $(date)

@keyframes gradientShift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.community-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 50%, #b8b8b8 100%);
  background-size: 200% 200%;
  animation: gradientShift 15s ease infinite;
  padding: 2rem;

  @media (max-width: 768px) {
    padding: 1rem;
  }
}

.community-header {
  text-align: center;
  margin-bottom: 3rem;
  padding: 3rem 0 2rem;

  .header-content {
    h1 {
      font-size: 3.5rem;
      font-weight: 800;
      color: #1a1a1a;
      margin-bottom: 1rem;
      animation: fadeInDown 0.8s ease-out;
      text-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

      @media (max-width: 768px) {
        font-size: 2.5rem;
      }
    }

    p {
      font-size: 1.2rem;
      color: #404040;
      font-weight: 500;
      max-width: 600px;
      margin: 0 auto;
      line-height: 1.6;

      @media (max-width: 768px) {
        font-size: 1rem;
      }
    }
  }
}

.community-tabs {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 3rem;
  flex-wrap: wrap;
  max-width: 900px;
  margin-left: auto;
  margin-right: auto;

  .tab-btn {
    padding: 1rem 2rem;
    border: 2px solid rgba(255, 255, 255, 0.4);
    border-radius: 30px;
    background: rgba(255, 255, 255, 0.3);
    -webkit-backdrop-filter: blur(20px);
    backdrop-filter: blur(20px);
    color: #1a1a1a;
    font-weight: 600;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);

    &:hover {
      background: rgba(255, 255, 255, 0.4);
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
      border: 2px solid rgba(255, 255, 255, 0.6);
    }

    &.active {
      background: white;
      color: #1a1a1a;
      border: 2px solid #1a1a1a;
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
    }
  }

  @media (max-width: 768px) {
    gap: 0.5rem;

    .tab-btn {
      padding: 0.75rem 1.5rem;
      font-size: 0.9rem;
    }
  }
}

.community-content {
  max-width: 1200px;
  margin: 0 auto;
  min-height: 400px;
}

// LOADING STATE
.loading-state {
  text-align: center;
  padding: 4rem 2rem;

  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
    margin-bottom: 2rem;

    .loading-spinner.large {
      width: 60px;
      height: 60px;
      border: 4px solid rgba(255, 255, 255, 0.3);
      border-top: 4px solid #1a1a1a;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    .loading-text {
      h3 {
        font-size: 1.5rem;
        color: #1a1a1a;
        margin-bottom: 0.5rem;
      }

      p {
        color: #404040;
        font-size: 1rem;
      }
    }
  }

  .loading-skeletons {
    display: flex;
    flex-direction: column;
    gap: 2rem;
    max-width: 800px;
    margin: 0 auto;

    .skeleton-card {
      background: rgba(255, 255, 255, 0.3);
      -webkit-backdrop-filter: blur(20px);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.4);
      border-radius: 20px;
      padding: 2rem;

      .skeleton {
        background: linear-gradient(90deg, rgba(0, 0, 0, 0.05) 25%, rgba(0, 0, 0, 0.1) 50%, rgba(0, 0, 0, 0.05) 75%);
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite;
        border-radius: 8px;
      }

      .skeleton-header {
        height: 50px;
        width: 60%;
        margin-bottom: 1rem;
      }

      .skeleton-content {
        height: 100px;
        width: 100%;
        margin-bottom: 1rem;
      }

      .skeleton-actions {
        height: 30px;
        width: 40%;
      }
    }
  }
}

// FEED SECTION
.feed-section {
  .posts-container {
    display: flex;
    flex-direction: column;
    gap: 2rem;
    max-width: 800px;
    margin: 0 auto;
  }

  .post-card {
    background: rgba(255, 255, 255, 0.3);
    -webkit-backdrop-filter: blur(20px);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.4);
    border-radius: 20px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
    overflow: hidden;
    transition: all 0.3s ease;
    padding: 2rem;

    &:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
      border: 1px solid rgba(255, 255, 255, 0.6);
    }

    .post-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid rgba(0, 0, 0, 0.1);

      .author-info {
        display: flex;
        align-items: center;
        gap: 1rem;

        .author-avatar {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid rgba(255, 255, 255, 0.5);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
          transition: all 0.3s ease;

          &:hover {
            transform: scale(1.1);
            box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
          }
        }

        .author-details {
          .author-name {
            font-weight: 700;
            font-size: 1.05rem;
            color: #1a1a1a;
            margin-bottom: 0.25rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;

            .author-badge {
              color: white;
              padding: 0.25rem 0.75rem;
              border-radius: 12px;
              font-size: 0.75rem;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              background: rgba(0, 0, 0, 0.2);
            }
          }

          .post-time {
            font-size: 0.9rem;
            color: #404040;
            font-weight: 500;
          }
        }
      }

      .post-menu-btn {
        background: rgba(255, 255, 255, 0.4);
        border: 1px solid rgba(255, 255, 255, 0.5);
        font-size: 1.5rem;
        color: #2d2d2d;
        cursor: pointer;
        padding: 0.5rem 0.75rem;
        border-radius: 12px;
        transition: all 0.2s ease;

        &:hover {
          background: rgba(255, 255, 255, 0.6);
          transform: scale(1.1);
          border: 1px solid rgba(255, 255, 255, 0.7);
        }
      }
    }

    .post-content {
      margin-bottom: 1.5rem;

      p {
        font-size: 1.05rem;
        font-weight: 400;
        line-height: 1.7;
        color: #2d2d2d;
        margin-bottom: 1.5rem;
      }

      .post-images {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 1rem;
        margin-bottom: 1.5rem;

        .post-image {
          width: 100%;
          height: 240px;
          object-fit: cover;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          transition: all 0.3s ease;

          &:hover {
            transform: scale(1.05);
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
          }
        }
      }

      .post-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;

        .tag {
          background: rgba(255, 255, 255, 0.5);
          color: #1a1a1a;
          padding: 0.4rem 1rem;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 600;
          border: 1px solid rgba(0, 0, 0, 0.1);
          transition: all 0.2s ease;

          &:hover {
            background: rgba(255, 255, 255, 0.7);
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            border: 1px solid rgba(0, 0, 0, 0.2);
          }
        }
      }
    }

    .post-actions {
      display: flex;
      gap: 1rem;
      padding-top: 1.5rem;
      border-top: 1px solid rgba(0, 0, 0, 0.1);
      justify-content: space-around;

      .action-btn {
        background: rgba(255, 255, 255, 0.4);
        border: 1px solid rgba(255, 255, 255, 0.5);
        color: #2d2d2d;
        font-weight: 600;
        font-size: 0.95rem;
        cursor: pointer;
        padding: 0.75rem 1.5rem;
        border-radius: 20px;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex: 1;
        justify-content: center;

        &:hover {
          background: rgba(255, 255, 255, 0.6);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.7);
        }

        &.liked {
          color: #dc2626;
          border-color: rgba(220, 38, 38, 0.3);
          background: rgba(220, 38, 38, 0.1);

          &:hover {
            background: rgba(220, 38, 38, 0.15);
          }
        }

        &:active {
          transform: translateY(0);
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
        }
      }
    }
  }
}

// TRENDING SECTION
.trending-section {
  max-width: 1000px;
  margin: 0 auto;

  h2 {
    font-size: 2.5rem;
    font-weight: 700;
    color: #1a1a1a;
    margin-bottom: 2rem;
    text-align: center;
  }

  .trending-topics {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1.5rem;
    margin-bottom: 3rem;

    .trending-topic {
      background: rgba(255, 255, 255, 0.3);
      -webkit-backdrop-filter: blur(20px);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.4);
      border-radius: 20px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
      transition: all 0.3s ease;
      padding: 2rem;
      text-align: center;
      cursor: pointer;

      &:hover {
        transform: translateY(-6px);
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
        border: 1px solid rgba(255, 255, 255, 0.6);

        .topic-name {
          transform: scale(1.05);
        }
      }

      .topic-name {
        display: block;
        font-weight: 700;
        color: #1a1a1a;
        font-size: 1.5rem;
        margin-bottom: 1rem;
        transition: transform 0.3s ease;
      }

      .topic-count {
        color: #404040;
        font-size: 0.9rem;
        font-weight: 600;
        background: rgba(255, 255, 255, 0.5);
        padding: 0.5rem 1rem;
        border-radius: 20px;
        display: inline-block;
        border: 1px solid rgba(0, 0, 0, 0.1);
      }
    }
  }
}

// CHEFS SECTION
.chefs-section {
  max-width: 1000px;
  margin: 0 auto;

  h2 {
    font-size: 2.5rem;
    font-weight: 700;
    color: #1a1a1a;
    margin-bottom: 2rem;
    text-align: center;
  }

  .chefs-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 2rem;

    .chef-card {
      background: rgba(255, 255, 255, 0.3);
      -webkit-backdrop-filter: blur(20px);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.4);
      border-radius: 20px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
      overflow: hidden;
      transition: all 0.3s ease;
      padding: 2rem;
      text-align: center;

      &:hover {
        transform: translateY(-8px);
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
        border: 1px solid rgba(255, 255, 255, 0.6);

        .chef-avatar {
          transform: scale(1.1);
        }
      }

      .chef-avatar {
        width: 120px;
        height: 120px;
        border-radius: 50%;
        object-fit: cover;
        margin: 0 auto 1.5rem;
        border: 3px solid rgba(255, 255, 255, 0.6);
        box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
        transition: all 0.3s ease;
      }

      .chef-info {
        .chef-name {
          font-size: 1.4rem;
          font-weight: 700;
          color: #1a1a1a;
          margin-bottom: 0.5rem;
        }

        .chef-specialty {
          font-size: 1rem;
          color: #404040;
          margin-bottom: 1rem;
          font-weight: 500;
        }

        .chef-stats {
          display: flex;
          justify-content: center;
          gap: 1.5rem;
          margin-bottom: 1.5rem;

          .stat {
            .stat-value {
              font-size: 1.3rem;
              font-weight: 700;
              color: #1a1a1a;
              display: block;
            }

            .stat-label {
              font-size: 0.85rem;
              color: #404040;
              font-weight: 500;
            }
          }
        }

        .follow-btn {
          padding: 0.75rem 2rem;
          border-radius: 30px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          width: 100%;
          font-size: 1rem;

          &.following {
            background: white;
            color: #1a1a1a;
            border: 2px solid #1a1a1a;

            &:hover {
              background: #1a1a1a;
              color: white;
            }
          }

          &:not(.following) {
            background: #1a1a1a;
            color: white;
            border: 2px solid #1a1a1a;

            &:hover {
              background: white;
              color: #1a1a1a;
              transform: scale(1.05);
            }
          }
        }
      }
    }
  }
}

// CREATE POST SECTION
.create-section {
  max-width: 800px;
  margin: 0 auto;

  h2 {
    font-size: 2.5rem;
    font-weight: 700;
    color: #1a1a1a;
    margin-bottom: 2rem;
    text-align: center;
  }

  .create-post-form {
    background: rgba(255, 255, 255, 0.3);
    -webkit-backdrop-filter: blur(20px);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.4);
    border-radius: 20px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
    padding: 2.5rem;

    .form-group {
      margin-bottom: 2rem;

      label {
        display: block;
        font-weight: 600;
        color: #1a1a1a;
        margin-bottom: 0.75rem;
        font-size: 1.05rem;
      }

      textarea,
      input {
        width: 100%;
        padding: 1rem;
        border: 2px solid rgba(255, 255, 255, 0.4);
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.5);
        color: #1a1a1a;
        font-size: 1rem;
        transition: all 0.3s ease;
        font-family: inherit;

        &:focus {
          outline: none;
          border: 2px solid #1a1a1a;
          background: rgba(255, 255, 255, 0.7);
        }

        &::placeholder {
          color: #888888;
        }
      }

      textarea {
        min-height: 150px;
        resize: vertical;
      }

      .char-count {
        text-align: right;
        font-size: 0.85rem;
        color: #404040;
        margin-top: 0.5rem;
      }

      .file-upload {
        display: flex;
        align-items: center;
        gap: 1rem;

        .file-input {
          display: none;
        }

        .file-label {
          padding: 0.75rem 1.5rem;
          background: rgba(255, 255, 255, 0.5);
          border: 2px solid rgba(255, 255, 255, 0.4);
          border-radius: 20px;
          color: #1a1a1a;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;

          &:hover {
            background: rgba(255, 255, 255, 0.7);
            border: 2px solid #1a1a1a;
          }
        }

        .file-info {
          color: #404040;
          font-size: 0.9rem;
        }
      }
    }

    .form-actions {
      display: flex;
      gap: 1rem;
      justify-content: flex-end;

      button {
        padding: 1rem 2.5rem;
        border-radius: 30px;
        font-weight: 700;
        font-size: 1rem;
        cursor: pointer;
        transition: all 0.3s ease;

        &.cancel-btn {
          background: rgba(255, 255, 255, 0.5);
          border: 2px solid rgba(255, 255, 255, 0.4);
          color: #1a1a1a;

          &:hover {
            background: rgba(255, 255, 255, 0.7);
            border: 2px solid #1a1a1a;
          }
        }

        &.submit-btn {
          background: #1a1a1a;
          color: white;
          border: 2px solid #1a1a1a;

          &:hover {
            background: white;
            color: #1a1a1a;
            transform: scale(1.05);
          }

          &:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
          }
        }
      }
    }
  }
}

// RESPONSIVE DESIGN
@media (max-width: 768px) {
  .feed-section .posts-container,
  .trending-section,
  .chefs-section,
  .create-section {
    padding: 0 1rem;
  }

  .post-card {
    padding: 1.5rem;

    .post-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 1rem;
    }

    .post-actions {
      flex-wrap: wrap;

      .action-btn {
        flex: 1 1 calc(50% - 0.5rem);
        min-width: 120px;
      }
    }
  }

  .chefs-grid {
    grid-template-columns: 1fr;
  }

  .create-section .create-post-form {
    padding: 1.5rem;

    .form-actions {
      flex-direction: column;

      button {
        width: 100%;
      }
    }
  }
}
SCSS_CONTENT

echo "✅ New glassmorphic SCSS file created"
echo ""
echo "📋 Summary:"
echo "   - Background: Animated gradient"
echo "   - Cards: Glassmorphic with blur effect"
echo "   - Colors: Monochrome (white-grey-black)"
echo "   - Interactions: Hover effects & animations"
echo ""
echo "🎉 Community page redesign complete!"
echo ""
echo "To restore backup if needed:"
echo "   cp $BACKUP_FILE $SCSS_FILE"
