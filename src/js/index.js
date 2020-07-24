import Search from './models/Search';
import Recipe from './models/Recipe';
import List from './models/List';
import Likes from './models/Likes';

import * as searchView from './views/searchView';
import * as recipeView from './views/recipeView';
import * as listView from './views/listView';
import * as likeView from './views/likeView';

import { elements, renderLoader, clearLoader } from './views/base';

/**Global state of the app
 * - Search object
 * - Current recipe object
 * - Shopping list object
 * - Liked recipes 
 */ 

const state = {};

/**
 * SEARCH CONTROLLER
 */

const controlSearch = async () => {
    // 1. Get the query from the view
    const query = searchView.getInput();

    if(query) {
        // 2. New search object and add it to state
        state.search = new Search(query);

        // 3. Prepare UI for results
        searchView.clearInput();
        searchView.clearResults();
        renderLoader(elements.searchRes);

        try{
            // 4. Search for recipes
            await state.search.getResults();
    
            // 5. Render results on UI
            clearLoader();
            searchView.renderResults(state.search.result);
        }catch(err) {
            alert('Something wrong with the search...');
            clearLoader();
        }
    }
}

elements.searchForm.addEventListener('submit', e => {
    e.preventDefault();
    controlSearch();
});

elements.searchResPages.addEventListener('click', e => {
    const btn = e.target.closest('.btn-inline');
    if(btn){
        const goToPage = parseInt(btn.dataset.goto, 10);
        searchView.clearResults();
        searchView.renderResults(state.search.result, goToPage);
    }
});

/**
 * RECIPE CONTROLLER
 */

const controlRecipe = async () => {
    //Get ID from url
    const id = window.location.hash.replace('#', '');

    if(id) {
        //Prepare UI for changes
        recipeView.clearRecipe();
        renderLoader(elements.recipe);

        //Highlight selected search item
        if(state.search) searchView.highlightSelected(id);

        //Create new Recipe obj
        state.recipe = new Recipe(id);
        try{
            //Get recipe data and parse ingredients

            await state.recipe.getRecipe();
            state.recipe.parseIngredients();
    
            //Calculate servings and time
            state.recipe.calcServings();
            state.recipe.calcTime();

            
            //Render the recipe
            clearLoader();
            recipeView.renderRecipe(state.recipe, state.likes.isLiked(id));
        
        } catch(err) {
            alert('Error processing recipe!');
        }
    }
}

['hashchange', 'load'].forEach( event => window.addEventListener(event, controlRecipe));


/**
 * LIST CONTROLLER
 */

const controlList = () => {
    //1. Create a new list IF there is none yet

    if(!state.list) state.list = new List();

    //2. Add each ingredient to the list and UI

    state.recipe.ingredients.forEach( el => {
        const item = state.list.addItem(el.count, el.unit, el.ingredient);
        listView.renderItem(item);
    })
}

elements.shopping.addEventListener('click', e => {
    const id = e.target.closest('.shopping__item').dataset.itemid;
    
    //Handle the delete btn
    if(e.target.closest('.shopping__delete')){
        //Delete from state and UI
        
        state.list.deleteItem(id);
        
        listView.deleteItem(id);

    //Handle the count update
} else if(e.target.matches('.shopping__count-value')) {
    const val = parseFloat(e.target.value, 10);
    state.list.updateCount(id, val);
}
});


/**
 * LIKE CONTROLLER
 */

const controleLike = () => {
    if(!state.likes) state.likes = new Likes();
    const currentID = state.recipe.id; 

    //User has NOT yet liked current ID
    if(!state.likes.isLiked(currentID)){
        //Add like to the state
        const newLike = state.likes.addLike(
            currentID, 
            state.recipe.title, 
            state.recipe.author, 
            state.recipe.img
        );

        //Toggle like button
        likeView.toggleLikeBtn(true);

        //Add like to the UI list
        likeView.renderLike(newLike);

    //User HAS yet liked current ID
    }else {
        //Remove like from the state
        state.likes.deleteLike(currentID);

        //Toggle like button
        likeView.toggleLikeBtn(false);

        //Remove like from the UI list
        likeView.deleteLike(currentID);
    }

    likeView.toggleLikeMenu(state.likes.getNumLikes());
}

// Restore liked recipes on page load
window.addEventListener('load', () => {
    state.likes = new Likes();

    // Restore likes
    state.likes.readStorage();

    //Toggle like menu button
    likeView.toggleLikeMenu(state.likes.getNumLikes());

    // Render the existings likes

    state.likes.likes.forEach( like => likeView.renderLike(like));
    
})

//Handling recipe button click
elements.recipe.addEventListener('click', e => {
    if(e.target.matches('.btn-decrease, .btn-decrease *')) {
        //Decrease btn is clicked
        if(state.recipe.servings > 1) state.recipe.updateServings('dec');
    } else if(e.target.matches('.btn-increase, .btn-increase *')){
        //Incerase
        state.recipe.updateServings('inc');
    } else if(e.target.matches('.recipe__btn--add, .recipe__btn--add *')) {
        //Add ingredients to the shopping list
        controlList();
    } else if(e.target.matches('.recipe__love, .recipe__love *')){
        //Like controller
        controleLike();
    }

    recipeView.updateServingsIngredients(state.recipe);
})
