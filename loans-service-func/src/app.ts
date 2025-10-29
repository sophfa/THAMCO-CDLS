// Main entry point for Azure Functions v4
// This file imports all function modules to ensure they are registered

import './functions/loans/listLoansHttp';
import './functions/loans/createLoanHttp';
import './functions/loans/getLoanHttp';
import './functions/loans/getUserLoansHttp';
import './functions/loans/returnLoanHttp';

import './functions/favourites/addFavouriteHttp';
import './functions/favourites/clearFavouritesHttp';
import './functions/favourites/listFavouritesHttp';
import './functions/favourites/removeFavouriteHttp';
import './functions/favourites/syncFavouritesHttp';

import './functions/waitlist/addToWaitlistHttp';