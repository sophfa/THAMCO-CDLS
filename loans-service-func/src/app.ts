// Main entry point for Azure Functions v4
// This file imports all function modules to ensure they are registered

import './functions/loans/listLoansHttp';
import './functions/loans/authLoanHttp';
import './functions/loans/createLoanHttp';
import './functions/loans/getLoanHttp';
import './functions/loans/getUserLoansHttp';
import './functions/loans/returnLoanHttp';
import './functions/loans/cancelLoanHttp';
import './functions/loans/collectLoanHttp';
import './functions/loans/rejectLoanHttp';
import './functions/loans/getDeviceLoanHistoryHttp';

import './functions/favourites/addFavouriteHttp';
import './functions/favourites/clearFavouritesHttp';
import './functions/favourites/listFavouritesHttp';
import './functions/favourites/removeFavouriteHttp';
import './functions/favourites/syncFavouritesHttp';

import './functions/waitlist/addToWaitlistHttp';
import './functions/waitlist/addToWaitlistByDeviceHttp';
import './functions/waitlist/getUserWaitlistHttp';
import './functions/waitlist/getWaitlistForProductHttp';
import './functions/waitlist/removeUserFromWaitlistHttp';
