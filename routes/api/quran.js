// In your routes file, e.g., routes/ayah.js
const express = require('express');
const router = express.Router();
const Ayah = require('../../models/Ayah');
const QuranSearch = require('../../models/QuranSearch');
const Quran = require('../../models/Quran');

router.get('/testing/search', async (req, res) => {
  try {
    let { searchWord } = req.query;

    // Check if searchWord is defined and not empty
    if (!searchWord || searchWord.trim() === '') {
      return res.status(400).json({ message: 'Invalid search term.' });
    }

    // Trim and normalize the search term
    const normalizedSearchWord = searchWord.trim().normalize('NFKC');
    // console.log(normalizedSearchWord);
    let randomResult

    // Use the regex with explicit word boundaries for a partial match
    const partialResults = await Quran.find({ AyatNoAraab: { $regex: normalizedSearchWord, $options: 'i' } })
    .select('AyatNoAraab AyatNew  TarjumaLafziDrFarhatHashmi');
    

        // console.log(partialResults);
    // If there are no partial matching records, return a 404 response
    if (!partialResults || partialResults.length === 0) {
      return res.status(404).json({ message: 'No matching record found.' });
    }
    // console.log(partialResults);

    // Filter results for exact match
    const exactResults = partialResults.filter(result => {
      const normalizedResult = result.AyatNoAraab.trim().normalize('NFKC');
     
      // Split the string based on space
      const words = normalizedResult.split(/\s+/);
    
      // Join the words that start with 'و' and the following word
      const joinedWords = [];
      for (let i = 0; i < words.length; i++) {
        if (words[i].startsWith('و') && i + 1 < words.length) {
          joinedWords.push(words[i] + words[i + 1]);
          i++; // Skip the next word as it's already joined
        } else {
          joinedWords.push(words[i]);
        }
      }
    
      const cleanedWords = joinedWords.map(removeDotsFromYaa);

  // console.log('Split', cleanedWords);
  // console.log(removeDotsFromYaa(normalizedSearchWord));
  removeArabicDiacritics(removeDotsFromYaa(normalizedSearchWord.toLowerCase())).replace(/\s/g, '');
  // console.log('Is Match?', cleanedWords.includes(normalizedSearchWord));
  const cleanedSearchTerm = removeArabicDiacritics(removeDotsFromYaa(normalizedSearchWord.toLowerCase())).replace(/\s/g, '');

  return cleanedWords.includes(removeDotsFromYaa(cleanedSearchTerm));
    });

    

    // If there are no exact matching records, return a 404 response
    if (!exactResults || exactResults.length === 0) {
      if (partialResults && partialResults.length > 0) {
        // Set randomResult to the first element of partialResults
        randomResult = partialResults[0];
      } else {
        // Return a 404 response if no partial results are found
        return res.status(404).json({ message: 'No matching record found.' });
      }
    } else {
      if(exactResults.length > 0){
       
         randomResult = exactResults[0];
      }
      // If there are exact matching records, set randomResult to the first element of exactResults
      randomResult = exactResults[0];
      
    }

    console.log('Random Result',randomResult)
    // const randomResult = exactResults[Math.floor(Math.random() * exactResults.length)];
    // If there are exact matching records, return the result
     // Extract words and meanings from the selected result
   
     let wordsAndMeanings = [];

if (Array.isArray(randomResult.TarjumaLafziDrFarhatHashmi)) {
  wordsAndMeanings = randomResult.TarjumaLafziDrFarhatHashmi.map(item => ({
    word: item.word,
    meaning: item.meaning,
  }));
  // console.log("WordsandMeaning", wordsAndMeanings);
} else if (typeof randomResult.TarjumaLafziDrFarhatHashmi === 'string') {
  const regex = /\[([^:]+): ([^\]]+)\]/g;
  let match;
  while ((match = regex.exec(randomResult.TarjumaLafziDrFarhatHashmi)) !== null) {
    wordsAndMeanings.push({ word: match[1], meaning: match[2] });
  }
  console.log('Word Meaning Testing',wordsAndMeanings);
  // console.log("2nd ElseWordsandMeaning", wordsAndMeanings);
}

// Find the correct word and its meaning
let matchingWordAndMeaning = wordsAndMeanings.find((item) => {
  const cleanedWord = removeArabicDiacritics(replaceArabicKaf(replaceHehWithH(removeDotsFromYaa(item.word))));
  // const cleanedQuery = removeArabicDiacritics(searchWord.toLowerCase());
  const cleanedQuery = removeArabicDiacritics(removeDotsFromYaa(normalizedSearchWord.toLowerCase())).replace(/\s/g, '');
  // console.log('Clean Word', cleanedWord);
  // console.log('Search Word', cleanedQuery);
  // console.log('Is Match?', cleanedWord.includes(normalizedSearchWord));
  return cleanedWord.includes(cleanedQuery);
});
console.log('Testing ',matchingWordAndMeaning)

// If word is not found, perform search in TarjumaLafziDrFarhatHashmi
 
 
     // If correct word and meaning are found
     if (matchingWordAndMeaning) {
       // Create an array to store quiz options
       const quizOptions = [];
 
       // Add the correct option
       quizOptions.push({ meaning: matchingWordAndMeaning.meaning, isCorrect: true });
 
       // Add three other options from the same Ayat
       for (let i = 0; i < 3; i++) {
         const randomOption = wordsAndMeanings[Math.floor(Math.random() * wordsAndMeanings.length)];
         // Ensure the random option is different from the correct option
         if (randomOption.word !== matchingWordAndMeaning.word) {
           quizOptions.push({ meaning: randomOption.meaning, isCorrect: false });
         } else {
           // If the random option is the same as the correct option, decrement the counter to try again
           i--;
         }
       }
 
       // Shuffle the quiz options randomly
       shuffleArray(quizOptions);
 
       // Create the response object
       const response = {
         AyatNew: randomResult.AyatNew,
         AyatNoAraab: randomResult.AyatNoAraab,
         WordsAndMeanings: matchingWordAndMeaning ? [matchingWordAndMeaning] : [],
         QuizOptions: quizOptions,
       };
 
       res.json(response);
     } else {
       // Handle the case where no matching word and meaning are found
       res.status(404).json({ error: 'No matching word and meaning found' });
     }
  } catch (error) {
    console.error('Error during search:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});



// GET translation for a specific Surah for FatehMuhammadJalandhri
router.get('/ayahs/fateh/:suraID', (req, res) => {
  const { suraID } = req.params;

  Ayah.findOne({ SuraID: suraID })
    .select('SuraID FatehMuhammadJalandhri ArabicText')
    .then((ayah) => {
      if (!ayah) {
        return res.status(404).json({ error: 'Ayah not found' });
      }

      res.json({
        suraID: ayah.SuraID,
        author: 'FatehMuhammadJalandhri',
        arabicText: ayah.ArabicText,
        translation: ayah.FatehMuhammadJalandhri
      });
    })
    .catch((error) => {
      console.error('Error retrieving Ayah:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    });
});

router.get('/ayahs/:ayahNo/:author', (req, res) => {
  const { ayahNo, author } = req.params;

  Ayah.findOne({ AyaNo: ayahNo })
    .select(`AyaNo ${author} ArabicText`)
    .then((ayah) => {
      if (!ayah) {
        return res.status(404).json({ error: 'Ayah not found' });
      }

      res.json({
        ayahNo: ayah.AyaNo,
        author,
        arabicText: ayah.ArabicText,
        translation: ayah[author]
      });
    })
    .catch((error) => {
      console.error('Error retrieving Ayah:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    });
});

router.get('/surah/:suraID/:author', (req, res) => {
  const { suraID, author } = req.params;

  Quran.find({ SuraID: suraID })
    .select(`AyaNo ${author} Ayat AyatNew`)
    .sort('AyaNo')
    .then((ayahs) => {
      if (ayahs.length === 0) {
        return res.status(404).json({ error: 'Surah not found' });
      }

      const authorAyahs = ayahs.map((ayah) => ({
        ayahNo: ayah.AyaNo,
        AyatNew: ayah.AyatNew,
        Ayat: ayah.Ayat,
        translation: ayah[author]
      }));

      res.json({
        surahID: suraID,
        author,
        ayahs: authorAyahs
      });
    })
    .catch((error) => {
      console.error('Error retrieving Ayahs:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    });
});

router.get('/surah/:suraID/turjma/:author', async (req, res) => {
  try {
    const { suraID, author } = req.params;

    // Define the projection to include the specific translation column
    const projection = {
      AyaNo: 1,
      Ayat: 1,
      AyatNew: 1,
      [author]: 1, // Use the author parameter as the column name
    };

    // Fetch Ayahs with translations using lean() for better performance
    const ayahs = await Quran.find({ SuraID: suraID }).select(projection).sort('AyaNo').lean();

    if (ayahs.length === 0) {
      return res.status(404).json({ error: 'Surah not found' });
    }

    const translationAyahs = ayahs.map((ayah) => {
      const translationParts = ayah[author]
        .match(/\[([^:]+): ([^\]]+)\]/g)
        .map((word) => {
          const matches = /\[([^:]+): ([^\]]+)\]/.exec(word);
          return {
            word: matches[1],
            meaning: matches[2].trim(), // trim to remove leading/trailing spaces
          };
        });

      return {
        ayahNo: ayah.AyaNo,
        AyatNew: ayah.AyatNew,
        Ayat: ayah.Ayat,
        translation: translationParts, // Include the MongoDB stored format in the response
      };
    });

    const response = {
      surahID: suraID,
      author: author,
      ayahs: translationAyahs,
    };

    res.json(response);
  } catch (error) {
    console.error('Error retrieving Ayahs:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});








// router.get('/search', async (req, res) => {
//   try {
//     const searchText = req.query.q; // Get the search query from the request query string

//     // Use a regular expression to perform a case-insensitive search for the Arabic text
//     const regex = new RegExp(searchText, 'i');

//     // Query the database to find Ayahs that match the search text
//     const result = await Ayah.find({ ArabicText: regex });

//     res.json(result);
//   } catch (error) {
//     console.error('Search error:', error);
//     res.status(500).json({ error: 'Internal Server Error' });
//   }
// });



// GET route to search by AyatNoAraab or Ayat
// router.get('/search', async (req, res) => {
//   try {
//     const { query } = req.query;

//     // Use a regular expression to perform a case-insensitive search on AyatNoAraab or Ayat
//     const regexQuery = new RegExp(query, 'i');

//     const results = await QuranSearch.find({
//       $or: [
//         { AyatNoAraab: regexQuery },
//         { Ayat: regexQuery },
//       ],
//     });

//     if (!results || results.length === 0) {
//       return res.status(404).json({ message: 'No matching results found' });
//     }

//     res.json(results);
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: 'Internal Server Error' });
//   }
// });


// // GET route to search
// router.get('/search', async (req, res) => {
//   try {
//     const { query } = req.query;

//     // Attempt to parse the query as a number to handle numeric queries
//     const numericQuery = parseInt(query);

//     // Use a regular expression to perform a case-insensitive search on AyatNew or AyatNoAraab for text-based queries
//     const regexQuery = new RegExp(query, 'i');

//     // Create an empty array to store results
//     let combinedResults = [];

//     // Search in the QuranSearch model for SurahNo and AyatNo (numeric queries)
//     if (!isNaN(numericQuery)) {
//       const resultsBySurahNoAyatNo = await QuranSearch.find({
//         $or: [
//           { SurahNo: numericQuery },
//           { AyatNo: numericQuery },
//         ],
//       });

//       combinedResults = combinedResults.concat(resultsBySurahNoAyatNo);
//     }

//     // Search in the QuranSearch model for AyatNew or AyatNoAraab (text-based queries)
//     const resultsByText = await Quran.find({
//       $or: [
//         { AyatNew: regexQuery },
//         { AyatNoAraab: regexQuery },
//       ],
//     });

//     combinedResults = combinedResults.concat(resultsByText);

    

//     res.json(combinedResults);
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: 'Internal Server Error' });
//   }
// });





router.get('/search', async (req, res) => {
  try {
    const { query, author, translation, suraID, ayaID } = req.query;

    // Create an empty object to store filter conditions
    const filterConditions = {};

    // Create an array to store query conditions
    const queryConditions = [];

    // Define the query conditions for AyatNew and AyatNoAraab
    if (query) {
      queryConditions.push({
        $or: [
          { AyatNew: { $regex: query, $options: 'i' } }, // Case-insensitive search for AyatNew
          { AyatNoAraab: { $regex: query, $options: 'i' } }, // Case-insensitive search for AyatNoAraab
        ],
      });
    }

    // Define the query conditions for SuraID and AyaID (if provided together)
    if (!isNaN(parseInt(suraID)) && !isNaN(parseInt(ayaID))) {
      queryConditions.push({ SuraID: parseInt(suraID), AyaID: parseInt(ayaID) });
    }

    // Combine the query conditions with the $or operator
    if (queryConditions.length > 0) {
      filterConditions.$or = queryConditions;
    }

    // Create a projection object to specify the fields to retrieve
    const projection = {
      AyaID: 1,
      SuraID: 1,
      AyaNo: 1,
      RakuID: 1,
      PRakuID: 1,
      ParaID: 1,
      ID: 1,
      ParahNo: 1,
      SurahNo: 1,
      RukuParahNo: 1,
      RukuSurahNo: 1,
      AyatNo: 1,
      Ayat: 1,
      AyatNew: 1,
      AyatNoAraab: 1,
      AyatAndTarjuma: 1,
    };

    // If an author is specified, add the selected author column to the projection
    if (author) {
      projection[author] = 1;
    }

    // If a translation is specified, add the selected translation column to the projection
    if (translation) {
      projection[translation] = 1;
    }

    // Use the filter conditions and projection to query the database
    const results = await Quran.find(filterConditions, projection);

    res.json(results);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// GET route for autocomplete
router.get('/autocomplete', async (req, res) => {
  try {
    const { query } = req.query;

    // Use a regular expression to perform a case-insensitive search on AyatNoAraab for autocomplete
    const regexQuery = new RegExp(`^${query}`, 'i');

    // Use distinct to get unique values
    const results = await Quran.distinct('AyatNoAraab', { AyatNoAraab: regexQuery });

    res.json(results);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

router.get('/search/exact', async (req, res) => {
  try {
    const { word } = req.query;

    // Split the provided phrase into individual words
    const words = word.split(' ');

    // Create an array to store query conditions for each word
    const queryConditions = words.map(singleWord => ({
      AyatNoAraab: { $eq: singleWord },
    }));

    // Combine the query conditions with the $and operator
    const filterConditions = { $and: queryConditions };

    // Create a projection object to specify the fields to retrieve
    const projection = {
      AyatNoAraab: 1,
      AyatNew: 1,
      TarjumaLafziDrFarhatHashmi: 1,
    };

    // Use the filter conditions and projection to query the database
    const results = await Quran.find(filterConditions, projection);

    if (results.length > 0) {
      res.json(results);
    } else {
      res.status(404).json({ error: 'No matching results found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});



// GET route for quiz
router.get('/search/quiz', async (req, res) => {
  try {
    const { query, suraID, ayaID } = req.query;

    // Create an empty object to store filter conditions
    const filterConditions = {};

    // Create an array to store query conditions
    const queryConditions = [];

    // Define the query conditions for AyatNew and AyatNoAraab
    if (query) {
      const queryRegex = new RegExp(query, 'i');
      queryConditions.push({
        $or: [
          { AyatNew: queryRegex },
          { AyatNoAraab: queryRegex },
        ],
      });
    }

    // Define the query conditions for SuraID and AyaID (if provided together)
    if (!isNaN(parseInt(suraID)) && !isNaN(parseInt(ayaID))) {
      queryConditions.push({ SuraID: parseInt(suraID), AyaID: parseInt(ayaID) });
    }

    // Combine the query conditions with the $or operator
    if (queryConditions.length > 0) {
      filterConditions.$or = queryConditions;
    }

    // Create a projection object to specify the fields to retrieve
    const projection = {
      AyatNew: 1,
      AyatNoAraab: 1,
      TarjumaLafziDrFarhatHashmi: 1,
    };

    // Use the filter conditions and projection to query the database
    const results = await Quran.find(filterConditions, projection);

    // Select a random result from the query results
    const randomResult = results[Math.floor(Math.random() * results.length)];

    // Extract words and meanings from the selected result
    let wordsAndMeanings = [];

    if (Array.isArray(randomResult.TarjumaLafziDrFarhatHashmi)) {
      wordsAndMeanings = randomResult.TarjumaLafziDrFarhatHashmi.map(item => ({
        word: item.word,
        meaning: item.meaning,
      }));
    } else if (typeof randomResult.TarjumaLafziDrFarhatHashmi === 'string') {
      const regex = /\[([^:]+): ([^\]]+)\]/g;
      let match;
      while ((match = regex.exec(randomResult.TarjumaLafziDrFarhatHashmi)) !== null) {
        wordsAndMeanings.push({ word: match[1], meaning: match[2] });
      }
    }

    // Find the correct word and its meaning
    let matchingWordAndMeaning = wordsAndMeanings.find((item) => {
      const cleanedWord = removeArabicDiacritics(item.word);
      const cleanedQuery = removeArabicDiacritics(query.toLowerCase());
      return cleanedWord.includes(cleanedQuery);
    });

    // If correct word and meaning are found
    if (matchingWordAndMeaning) {
      // Create an array to store quiz options
      const quizOptions = [];

      // Add the correct option
      quizOptions.push({ meaning: matchingWordAndMeaning.meaning, isCorrect: true });

      // Add three other options from the same Ayat
      for (let i = 0; i < 3; i++) {
        const randomOption = wordsAndMeanings[Math.floor(Math.random() * wordsAndMeanings.length)];
        // Ensure the random option is different from the correct option
        if (randomOption.word !== matchingWordAndMeaning.word) {
          quizOptions.push({ meaning: randomOption.meaning, isCorrect: false });
        } else {
          // If the random option is the same as the correct option, decrement the counter to try again
          i--;
        }
      }

      // Shuffle the quiz options randomly
      shuffleArray(quizOptions);

      // Create the response object
      const response = {
        AyatNew: randomResult.AyatNew,
        AyatNoAraab: randomResult.AyatNoAraab,
        WordsAndMeanings: matchingWordAndMeaning ? [matchingWordAndMeaning] : [],
        QuizOptions: quizOptions,
      };

      res.json(response);
    } else {
      // Handle the case where no matching word and meaning are found
      res.status(404).json({ error: 'No matching word and meaning found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Helper function to shuffle an array randomly
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}
// Helper function to check if a word has Arabic diacritics
function hasArabs(word) {
  const arabicDiacriticsRegex = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/;
  return arabicDiacriticsRegex.test(word);
}

function replaceArabicKaf(text) {
  // Replace the Arabic kaf 'ك' with the Persian kaf 'ک'
  return text.replace(/ك/g, 'ک');
}
function replaceHehWithH(text) {
  // Replace the character 'ھ' with 'ه'
  return text.replace(/ھ/g, 'ه');
}

function removeArabicDiacritics(text) {
  // Replace Arabic diacritics with empty string
  const removedDiacritics = text.replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, '');

  // Normalize the string to remove variations in diacritic representation
  return removedDiacritics.normalize('NFKD');
}
function removeDotsFromYaa(text) {
  return text.replace(/ي/g, 'ى');
}

const inputText = 'اِھْدِنَا';
const cleanedText = removeArabicDiacritics(replaceArabicKaf(replaceHehWithH(inputText)));

console.log('Without Arab Testing',cleanedText);

module.exports = router;
