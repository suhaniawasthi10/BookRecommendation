// API Key (you'll need to get your own from Google Books API)
const API_KEY = CONFIG.GOOGLE_BOOKS_API_KEY;

// DOM Elements
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const booksGrid = document.getElementById('booksGrid');
const recommendationsGrid = document.getElementById('recommendationsGrid');
const addBookBtn = document.getElementById('addBookBtn');
const addBookModal = document.getElementById('addBookModal');
const addBookForm = document.getElementById('addBookForm');
const closeModal = document.querySelector('.close');
const genreTags = document.getElementById('genreTags');
const darkModeToggle = document.getElementById('darkModeToggle');
const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');

// State
let myLibrary = JSON.parse(localStorage.getItem('myLibrary')) || [];
let selectedGenres = [];

// Genre list
const genres = [
    'Fiction', 'Non-Fiction', 'Mystery', 'Science Fiction',
    'Fantasy', 'Romance', 'Thriller', 'Biography',
    'History', 'Science', 'Self-Help', 'Poetry'
];

// Add support for predefined bookshelves
const BOOKSHELVES = {
    FAVORITES: 0,
    PURCHASED: 1,
    TO_READ: 2,
    READING_NOW: 3,
    HAVE_READ: 4,
    REVIEWED: 5,
    RECENTLY_VIEWED: 6,
    MY_EBOOKS: 7,
    BOOKS_FOR_YOU: 8
};

// Add these popular genres for random recommendations
const POPULAR_GENRES = [
    'Fantasy', 'Mystery', 'Romance', 'Science Fiction',
    'Biography', 'History', 'Self-Help', 'Thriller'
];

// Initialize the app
async function init() {
    renderGenreTags();
    updateLibraryStats();
    renderLibrary();
    
    // Load random books for home page
    const randomBooks = await getRandomBooks();
    renderRecommendations(randomBooks);
    
    // Initialize theme
    initializeTheme();
}

// Render genre tags
function renderGenreTags() {
    genreTags.innerHTML = ''; // Clear existing tags
    genres.forEach(genre => {
        const tag = document.createElement('div');
        tag.className = `genre-tag ${selectedGenres.includes(genre) ? 'active' : ''}`;
        tag.textContent = genre;
        tag.addEventListener('click', () => toggleGenre(genre));
        genreTags.appendChild(tag);
    });
}

// Toggle genre selection
function toggleGenre(genre) {
    const index = selectedGenres.indexOf(genre);
    if (index === -1) {
        selectedGenres.push(genre);
    } else {
        selectedGenres.splice(index, 1);
    }
    renderGenreTags(); // Update tag appearance
    renderLibrary(); // Update library section
    
    // Refresh recommendations with current genre filters
    getRandomBooks().then(books => {
        renderRecommendations(books);
    });
}

// Update library statistics
function updateLibraryStats() {
    document.getElementById('currentlyReading').textContent = 
        myLibrary.filter(book => book.status === 'reading').length;
    document.getElementById('completed').textContent = 
        myLibrary.filter(book => book.status === 'completed').length;
    document.getElementById('wantToRead').textContent = 
        myLibrary.filter(book => book.status === 'wantToRead').length;
}

// Render library books
function renderLibrary() {
    booksGrid.innerHTML = '';
    let filteredBooks = myLibrary;
    
    if (selectedGenres.length > 0) {
        filteredBooks = myLibrary.filter(book => {
            // Check if book's genre matches any selected genre
            return selectedGenres.some(genre => 
                book.genre.toLowerCase().includes(genre.toLowerCase())
            );
        });
    }

    if (filteredBooks.length === 0) {
        booksGrid.innerHTML = `
            <div class="no-books-message">
                <i class="fas fa-book-open"></i>
                <p>No books found for selected genres</p>
            </div>`;
    } else {
        filteredBooks.forEach((book, index) => {
            const bookCard = createBookCard(book);
            bookCard.style.animationDelay = `${index * 0.1}s`;
            booksGrid.appendChild(bookCard);
        });
    }
}

// Enhanced search books using Google Books API
async function searchBooks(query, options = {}) {
    try {
        let url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}`;
        
        // Add optional parameters
        if (options.startIndex) url += `&startIndex=${options.startIndex}`;
        if (options.maxResults) url += `&maxResults=${options.maxResults}`;
        if (options.orderBy) url += `&orderBy=${options.orderBy}`; // 'relevance' or 'newest'
        if (options.filter) url += `&filter=${options.filter}`; // 'partial' or 'full' or 'free-ebooks' or 'paid-ebooks' or 'ebooks'
        if (options.printType) url += `&printType=${options.printType}`; // 'all' or 'books' or 'magazines'
        if (options.projection) url += `&projection=${options.projection}`; // 'full' or 'lite'
        
        url += `&key=${API_KEY}`;

        const response = await fetch(url);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error.message || 'Failed to fetch books');
        }
        
        return data;
    } catch (error) {
        console.error('Error searching books:', error);
        throw error;
    }
}

// Get a specific volume by ID
async function getVolumeById(volumeId) {
    try {
        const response = await fetch(
            `https://www.googleapis.com/books/v1/volumes/${volumeId}?key=${API_KEY}`
        );
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error.message || 'Failed to fetch volume');
        }
        
        return data;
    } catch (error) {
        console.error('Error fetching volume:', error);
        throw error;
    }
}

// Get user's bookshelf
async function getUserBookshelf(userId, shelf) {
    try {
        const response = await fetch(
            `https://www.googleapis.com/books/v1/users/${userId}/bookshelves/${shelf}/volumes?key=${API_KEY}`
        );
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error.message || 'Failed to fetch bookshelf');
        }
        
        return data;
    } catch (error) {
        console.error('Error fetching bookshelf:', error);
        throw error;
    }
}

// Enhanced render functions for book cards
function createBookCard(book, isDetailed = false) {
    const card = document.createElement('div');
    card.className = 'book-card';
    
    const volumeInfo = book.volumeInfo || book;
    const thumbnail = volumeInfo.imageLinks?.thumbnail || 
                     volumeInfo.cover || 
                     'https://via.placeholder.com/128x192?text=No+Cover';

    card.innerHTML = `
        <div class="book-cover-container">
            <img src="${thumbnail}" alt="${volumeInfo.title}" class="book-cover">
            ${volumeInfo.averageRating || volumeInfo.rating ? `
                <div class="book-rating">
                    <i class="fas fa-star"></i>
                    <span>${volumeInfo.averageRating || volumeInfo.rating}</span>
                </div>
            ` : ''}
            <div class="book-hover-overlay">
                <div class="overlay-content">
                    <button class="preview-btn">
                        <i class="fas fa-eye"></i>
                        <span>Preview Book</span>
                    </button>
                    ${!isDetailed ? `
                        <button class="remove-library-btn">
                            <i class="fas fa-trash"></i>
                            <span>Remove from Library</span>
                        </button>
                    ` : `
                        <button class="add-library-btn">
                            <i class="fas fa-plus"></i>
                            <span>Add to Library</span>
                        </button>
                    `}
                </div>
            </div>
        </div>
        <div class="book-info">
            <h3>${volumeInfo.title}</h3>
            <p class="author">${volumeInfo.authors?.[0] || volumeInfo.author || 'Unknown Author'}</p>
            ${!isDetailed ? `
                <div class="book-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${volumeInfo.progress || 0}%"></div>
                    </div>
                    <small>${volumeInfo.progress || 0}% complete</small>
                </div>
            ` : ''}
        </div>
    `;

    if (isDetailed) {
        const previewBtn = card.querySelector('.preview-btn');
        const addBtn = card.querySelector('.add-library-btn');

        previewBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (volumeInfo.previewLink) {
                window.open(volumeInfo.previewLink, '_blank');
            } else {
                alert('Preview not available for this book');
            }
        });

        addBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            addToLibrary(book);
        });
    } else {
        const previewBtn = card.querySelector('.preview-btn');
        const removeBtn = card.querySelector('.remove-library-btn');

        previewBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            try {
                const bookDetails = await getVolumeById(book.id);
                if (bookDetails.volumeInfo.previewLink) {
                    window.open(bookDetails.volumeInfo.previewLink, '_blank');
                } else {
                    alert('Preview not available for this book');
                }
            } catch (error) {
                console.error('Error fetching book preview:', error);
                alert('Unable to load book preview');
            }
        });

        if (removeBtn) {
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                removeFromLibrary(book);
            });
        }
    }

    return card;
}

// Smooth scroll to library section
function scrollToLibrary() {
    const librarySection = document.getElementById('library-section');
    librarySection.scrollIntoView({ behavior: 'smooth' });
}

// Update addToLibrary function
function addToLibrary(book) {
    const newBook = {
        id: book.id,
        title: book.volumeInfo.title,
        author: book.volumeInfo.authors?.[0] || 'Unknown Author',
        status: 'wantToRead',
        progress: 0,
        genre: book.volumeInfo.categories?.[0] || 'Uncategorized',
        cover: book.volumeInfo.imageLinks?.thumbnail || 
               book.volumeInfo.imageLinks?.smallThumbnail || 
               'https://via.placeholder.com/128x192?text=No+Cover',
        rating: book.volumeInfo.averageRating || 0,
        dateAdded: new Date().toISOString()
    };
    
    myLibrary.push(newBook);
    localStorage.setItem('myLibrary', JSON.stringify(myLibrary));
    updateLibraryStats();
    renderLibrary();
    
    // Scroll to library after adding book
    scrollToLibrary();
    
    // Show success notification
    showNotification('Book added to your library!');
}

// Add notification system
function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <span>${message}</span>
    `;
    document.body.appendChild(notification);
    
    // Trigger animation
    setTimeout(() => notification.classList.add('show'), 100);
    
    // Remove notification after animation
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Get book recommendations
async function getRecommendations() {
    const userGenres = myLibrary.map(book => book.genre);
    const mostReadGenre = getMostFrequent(userGenres);
    
    if (mostReadGenre) {
        const recommendations = await searchBooks(mostReadGenre);
        renderRecommendations(recommendations.items || []);
    }
}

// Render book recommendations
function renderRecommendations(books) {
    recommendationsGrid.innerHTML = '';
    
    if (!books || books.length === 0) {
        recommendationsGrid.innerHTML = `
            <div class="no-books-message">
                <i class="fas fa-book-open"></i>
                <p>No recommendations available</p>
            </div>`;
        return;
    }

    let filteredBooks = books;
    
    // Apply genre filter to recommendations if genres are selected
    if (selectedGenres.length > 0) {
        filteredBooks = books.filter(book => {
            const bookCategories = book.volumeInfo.categories || [];
            return selectedGenres.some(genre => 
                bookCategories.some(category => 
                    category.toLowerCase().includes(genre.toLowerCase())
                )
            );
        });
    }

    if (filteredBooks.length === 0) {
        recommendationsGrid.innerHTML = `
            <div class="no-books-message">
                <i class="fas fa-book-open"></i>
                <p>No recommendations found for selected genres</p>
            </div>`;
        return;
    }
    
    filteredBooks.forEach(book => {
        const card = createBookCard(book, true);
        recommendationsGrid.appendChild(card);
    });
}

// Utility function to get most frequent element in array
function getMostFrequent(arr) {
    return arr.sort((a,b) =>
        arr.filter(v => v === a).length - arr.filter(v => v === b).length
    ).pop();
}

// Event Listeners
searchBtn.addEventListener('click', async () => {
    const query = searchInput.value.trim();
    if (query) {
        const results = await searchBooks(query);
        renderRecommendations(results.items || []);
    }
});

addBookBtn.addEventListener('click', () => {
    addBookModal.style.display = 'block';
});

closeModal.addEventListener('click', () => {
    addBookModal.style.display = 'none';
});

addBookForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const newBook = {
        title: e.target.bookTitle.value,
        author: e.target.bookAuthor.value,
        status: e.target.bookStatus.value,
        progress: e.target.readProgress.value || 0,
        genre: 'Fiction', // You could add a genre select in the form
        cover: 'placeholder.jpg'
    };
    
    myLibrary.push(newBook);
    localStorage.setItem('myLibrary', JSON.stringify(myLibrary));
    
    updateLibraryStats();
    renderLibrary();
    addBookModal.style.display = 'none';
    addBookForm.reset();
});

// Initialize the app
init();

// Example usage:
searchBooks('Harry Potter', {
    maxResults: 20,
    orderBy: 'relevance',
    filter: 'ebooks',
    printType: 'books'
}).then(data => {
    // Handle results
}).catch(error => {
    // Handle error
});

// Add function to get a predefined bookshelf
async function getPredefinedBookshelf(shelfId) {
    try {
        const response = await fetch(
            `https://www.googleapis.com/books/v1/mylibrary/bookshelves/${shelfId}/volumes?key=${API_KEY}`
        );
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error.message || 'Failed to fetch bookshelf');
        }
        
        return data;
    } catch (error) {
        console.error('Error fetching bookshelf:', error);
        throw error;
    }
}

// Add reading position tracking
async function updateReadingPosition(volumeId, position) {
    // Note: This requires OAuth 2.0 authentication
    try {
        const response = await fetch(
            `https://www.googleapis.com/books/v1/mylibrary/readingpositions/${volumeId}`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${YOUR_OAUTH_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    position: position,
                    timestamp: new Date().toISOString()
                })
            }
        );
        
        if (!response.ok) {
            throw new Error('Failed to update reading position');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error updating reading position:', error);
        throw error;
    }
}

// Get random books for home page
async function getRandomBooks() {
    try {
        // If genres are selected, use those instead of random genres
        const genresToUse = selectedGenres.length > 0 ? 
            selectedGenres : 
            POPULAR_GENRES.sort(() => 0.5 - Math.random()).slice(0, 3);
        
        const recommendations = [];
        
        // Fetch books for each genre
        for (const genre of genresToUse) {
            const results = await searchBooks(genre, {
                maxResults: 4,
                orderBy: 'relevance',
                printType: 'books'
            });
            
            if (results.items) {
                recommendations.push(...results.items);
            }
        }
        
        // Shuffle and limit to 8 books
        return recommendations
            .sort(() => 0.5 - Math.random())
            .slice(0, 8);
    } catch (error) {
        console.error('Error fetching random books:', error);
        return [];
    }
}

// Add removeFromLibrary function
function removeFromLibrary(book) {
    // Find the book index in the library
    const index = myLibrary.findIndex(b => 
        b.title === book.title && b.author === book.author
    );
    
    if (index !== -1) {
        // Remove the book
        myLibrary.splice(index, 1);
        // Update localStorage
        localStorage.setItem('myLibrary', JSON.stringify(myLibrary));
        // Update UI
        updateLibraryStats();
        renderLibrary();
    }
}

// Scroll to Top Button
const scrollBtn = document.createElement('div');
scrollBtn.className = 'scroll-top';
scrollBtn.innerHTML = '<i class="fas fa-arrow-up"></i>';
document.body.appendChild(scrollBtn);

// Scroll and Button Visibility
window.addEventListener('scroll', () => {
    if (window.pageYOffset > 300) {
        scrollBtn.classList.add('visible');
    } else {
        scrollBtn.classList.remove('visible');
    }
});

// Scroll to Top Functionality
scrollBtn.addEventListener('click', () => {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
});

// Prevent buttons from overlapping on mobile
function updateButtonPositions() {
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
        scrollBtn.style.bottom = '5rem';
        addBookBtn.style.bottom = '2rem';
    } else {
        scrollBtn.style.bottom = '2rem';
        addBookBtn.style.bottom = '2rem';
    }
}

// Update positions on resize
window.addEventListener('resize', updateButtonPositions);
// Initial position setup
updateButtonPositions();

// Function to toggle dark mode
function toggleDarkMode() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    // Update icon
    darkModeToggle.innerHTML = `<i class="fas fa-${newTheme === 'dark' ? 'sun' : 'moon'}"></i>`;
}

// Initialize theme
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 
                      (prefersDarkScheme.matches ? 'dark' : 'light');
    
    document.documentElement.setAttribute('data-theme', savedTheme);
    darkModeToggle.innerHTML = `<i class="fas fa-${savedTheme === 'dark' ? 'sun' : 'moon'}"></i>`;
}

// Event listeners
darkModeToggle.addEventListener('click', toggleDarkMode);
prefersDarkScheme.addListener((e) => {
    const newTheme = e.matches ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
});
