// Basic functions
function concatenate_array_by_character(input_array, input_character) {
    resultString = ""; // Initialize an empty string to hold the concatenated result


    for (i = 0; i < lengthOf(input_array); i++) { // Loop through input_array and concatenate elements with input_character
        resultString += input_array[i];

        if (i < lengthOf(input_array) - 1) { // Add separator except for the last element
            resultString += input_character;
        }
    }

    return resultString;
}

function get_stack_name() { //Obtain the stack name from the current window
    //This may not be reliable when you have multiple windows since it seems like to just get the title from the current activated window
    stack_title = getTitle();
    stack_name_array = split(stack_title, "."); //file_name is an array

    if (stack_name_array.length == 1) { //My image names won't have "." in the middle so the first item of stack_name_array is always the image name itself
        stack_name = stack_name_array[0];
    } else if (stack_name_array.length > 1) {
        stack_name_array = Array.slice(stack_name_array, 0, stack_name_array.length - 1); //Remove the last item of stack_name_array, which is usually the extension name
        // Array.print(stack_name_array); //For debugging

        stack_name = concatenate_array_by_character(stack_name_array, "."); //Other people's image names can have "." in the middle, so this is a way to restore those middle "."
    } else {
        //Do nothing
    }

    if (indexOf(stack_name, " ") != -1) { // Replace any space by _
        stack_name = replace(stack_name, " ", "_");
    }

    // print("Stack name is "+stack_name); //For debugging
    return stack_name;
}

function save_selection_as_ROI(ROI_name) {
    roiManager("Add");

    n = roiManager("Count");
    last_idx = n - 1; // index of the last ROI. Idxing in .ijm starts from 0

    roiManager("Select", last_idx); // The newly added ROI will be the last one
    roiManager("Rename", ROI_name); //Rename the ROI so when you import them back later, it'll have a meaningful name

}

function save_all_roi() {
    selectROIsByRegex("^(whole_cell|line_ruffles_.*|line_ruffles_area_.*|non_ruffles|ruffles_.*)$");

    stack_title = get_stack_name();

    save_directory = judge_make_directory("Fiji_output\\ROI");
    roiManager("Save", save_directory + "\\" + stack_title + ".zip"); //Save as a .zip rather than a .roi here since importing .zip to ImageJ will put things into the ROI manager, while importing .roi will simply make the selection again without adding anything to the ROI manager

    // Caveat here is that when you have multiple ROI selected in the ROI manager, you should save it as .zip; when you have only 1 ROI selected, you should save it as .roi--in this case, if you still save as .zip, it'll save all the ROI in the current ROI manager
}

function selectROIsByRegex(regex_pattern) {
    roi_count = roiManager("Count");
    indices = newArray();
    indices_counter = 0;

    for (i = 0; i < roi_count; i++) {
        roiManager("Select", i);
        roi_name = Roi.getName();

        if (matches(roi_name, regex_pattern)) {
            indices[indices_counter] = i;
            indices_counter++;
        }
    }

    if (indices.length > 0) {
        roiManager("Select", indices); // multi-select
    }

    return indices;
}


function append_to_array(input_array, append_value) { //ImageJ script seems to lack a very basic append to an array function
    // input_array = Array.concat(input_array, append_value); //This doesn't work in some places since JavaScript passes arrays by reference and this line doesn't modify the input_array in place. When you reassign input_array, it creates a new local variable that doesn't affect the original array

    output_array = newArray();

    for (i = 0; i < input_array.length; i++) {
        output_array[i] = input_array[i]; // Copy existing elements to the new array
    }
    output_array[input_array.length] = append_value; // Add the new element to the end
    return output_array; // Return the new array

}

function check_item_in_array(input_array, input_item) {
    output_bool = false;
    for (i = 0; i < input_array.length; i++) {
        if (input_array[i] == input_item) {
            output_bool = true;
            break;
        }
    }

    return output_bool;
}

function average_array_num(input_array_num) { //input_array_num is an array of numbers and this function return the average from those numbers
    if (input_array_num.length == 0) {
        return 0; // Return 0 for an empty array to avoid division by zero.
    } else {
        sum = 0;
        for (i = 0; i < input_array_num.length; i++) {
            sum += input_array_num[i];
        }
        return sum / input_array_num.length;
    }
}

function smart_wait_for_user(display_message, window_width, window_height, check_frequency) {
    // The purpose of this function is to replace the waitForUser() which the user need to click the OK button in that window and that window cannot be detected by the code
    // The text window generated by this function can be detected by the code and thus, can be closed by a keystroke to avoid the user change hands from keyboard to mouse to save time
    // This function will be paired up with a macro that upon calling by a keystroke, will close the text window and continue the code running
    text_window_title = "Instruction"; // I force all the name for this kind of window so it'll be precisely closed. text_window_title cannot have space in it

    titles_check = getList("window.titles");
    for (i = 0; i < titles_check.length; i++) {
        if (titles_check[i] == text_window_title) {
            // Here it means the opened text window is still open
            waitForUser("A smart wait for user window already exists! Something is wrong!");
            return;
        }
    }

    run("Text Window...", "name=" + text_window_title + " width=" + window_width + " height=" + window_height);

    wrappde_text_window_title = "[" + text_window_title + "]"; // You have to wrap the text_window_title up like this to directly print into it
    print(wrappde_text_window_title, display_message); // Display the message into that text window
    print(wrappde_text_window_title, "Press [q] when you're done."); // Q is the triggering key for the macro "close_smart_wait_for_user [q]"

    text_window_open_flag = true
    while (text_window_open_flag) {
        titles = getList("window.titles");

        found_flag = false;
        for (i = 0; i < titles.length; i++) {
            if (titles[i] == text_window_title) {
                // Here it means the opened text window is still open
                found_flag = true;
                break;
            }
        }

        if (!found_flag) {
            if (text_window_open_flag) {
                // Here means the opened text window has been closed
                text_window_open_flag = false;
            }
            break;
        }
        wait(check_frequency); //How much sleep before next check
    }
}

macro
"close_smart_wait_for_user [q]"
{
    if (isOpen("Instruction")) {
        selectWindow("Instruction");
        run("Close");
    } else {
        waitForUser("No Instruction window exists! Something is wrong!");
    }
}

//Functions for file management
function obtain_desktop_directory() {//Obtain the string for desktop's directory on different computer
    path = getDirectory("home") + "Desktop\\";
    return path;
}

function judge_directory_exists(directory_str) {
    if (File.isDirectory(directory_str)) {
        return true;
    } else {
        return false;
    }
}


function judge_make_directory(output_folder_name) { //Check whether output_folder_name is on the desktop and if not, make one on your desktop to store the later outputs from processing
    desktop_directory = obtain_desktop_directory();

    output_folder_directory = desktop_directory + output_folder_name + "\\"; //"\\" here ensures it's a folder

    if (judge_directory_exists(output_folder_directory)) {
        //Lines below are commented out because they are part of the auto_everything function and I don't want to see the message box every time I process an image
        // Dialog.create("Output folder has been created!");
        // Dialog.addMessage("Output folder has already been created at directory: "+output_folder_directory);
    } else {
        File.makeDirectory(output_folder_directory);
    }

    return output_folder_directory;
}

function judge_file_exist(file_directory) { //Judge whether file_directory exists
    fileExists = File.exists(file_directory);

    // Print the result
    if (fileExists) {
        return true;
    } else {
        return false
    }
}

function judge_directory_exists(directory_str) {
    if (File.isDirectory(directory_str)) {
        return true;
    } else {
        return false;
    }
}

function create_text_file(file_directory) {
    if (!File.exists(file_directory)) { // Only create it if it doesn't exist; otherwise the original file will be overwritten
        File.saveString("", file_directory); // Create an empty .txt file

        do {
            wait(10);
        } while (!File.exists(file_directory)); //Ensure the text file is successfully created
    } else {

    }
}

function read_text_file_as_array(text_file_directory) {
    if (judge_file_exist(text_file_directory) == true) {

        file_strings = File.openAsString(text_file_directory);

        // I have to do the 2 lines below since when writing the mode text file using the print function, the file will have an additional new line character that I need to get rid of for the comparison later
        file_strings_array = split(file_strings, "\n");
    } else {
        file_strings_array = newArray("Input .txt file doesn't exist!");
    }

    return file_strings_array;
}

macro
"setup_output_folder [u]"
{
    save_directory = judge_make_directory("Fiji_output"); //Judge whether the desktop has a "Fiji_output" and if not, make that folder
    //If the folder is already there, nothing will happen

    processed_imgs_file_directory = save_directory + "\\proceesed_imgs.txt"; //This will record the images that have been processed along the way, in case if you need to process an image more than once. For example, if you have images that contains more than 1 cell that you want to process, instead of duplicating and renaming the input image files, you use this functionality to reprocess the same image without the 2nd cell's results overwriting the 1st cell's results

    create_text_file(processed_imgs_file_directory);
}

// Automatic functions

function rename_stack_and_record() {
    // Obtain the original file name
    filename = get_stack_name(); // This is the input filename without the file extension
    if (indexOf(filename, " ") != -1) { // Replace any space by _
        filename = replace(filename, " ", "_");
    }

    // Find all the filename in the processed_img.txt
    save_directory = judge_make_directory("Fiji_output");
    processed_imgs_file_directory = save_directory + "\\proceesed_imgs.txt";

    processeed_img_filenames = read_text_file_as_array(processed_imgs_file_directory);

    filename_first = filename + "_0";
    if (!check_item_in_array(processeed_img_filenames, filename_first)) {
        filename_new = filename_first;
    } else {
        max_idx = 0;
        // Check if it's in the processed_img.txt
        for (i = 0; i < processeed_img_filenames.length; i++) {
            filename_line = processeed_img_filenames[i];

            last_underscore_position = lastIndexOf(filename_line, "_");
            recorded_filename = substring(filename_line, 0, last_underscore_position);

            if (recorded_filename == filename) {
                filename_parts = split(filename_line, "_");

                idx = parseInt(filename_parts[filename_parts.length - 1]);
                if (idx <= max_idx) {

                } else {
                    max_idx = idx;
                }
            }
        }

        filename_new = filename + "_" + (max_idx + 1);
    }

    File.append(filename_new, processed_imgs_file_directory);

    rename(filename_new);
}

function rename_slices() {
    filename = get_stack_name();

    //1st slice is the target gene image
    setSlice(1);
    run("Set Label...", "label=[" + filename + "_LactC2]");

    //2nd slice is the actin image
    setSlice(2);
    run("Set Label...", "label=[" + filename + "_Actin]");

    //3rd slice is the DAPI image
    if (nSlices > 2) { //This means you have a brightfield image in the stack
        setSlice(3);
        run("Set Label...", "label=[" + filename + "_DAPI]");
    }
}


function display_with_auto_contrast() {
    contrast_sturated_pixels_percentages = newArray(0.1, 0.1); // These numbers are manually tested to be the best for each slice. You can run run("Enhance Contrast", "saturated="+number); in the new macro window to test multiple numbers for a slice and find the best one

    for (i = 1; i < nSlices + 1; i++) { //Iterate all slices
        //nSlices is the predefined variable that stores the total number of slices in a stack
        if (i <= 2) { // I only enhance the contrast for the 1st 2 slices
            setSlice(i);

            run("Enhance Contrast", "saturated=" + contrast_sturated_pixels_percentages[i - 1]); // This doesn't change the original intensity values on the images (raw image data is still intact and the process is reversible) but will change the image that the overlay will use
        }
    }
}


macro
"display_and_slice_renaming [d]"
{
    rename_stack_and_record(); // You can comment out this function call if you're sure that each input image contains only 1 cell that you want to analyze.
    // If you have multiple cells on 1 image that you want to analyze, then you either duplicate those input image files, or you use rename_stack_and_record() and just reopen the same image but continue to process the next cell. All you need to ensure is that each image file has a unique name since that will be used to judge whether the image has been processed before

    rename_slices();

    display_with_auto_contrast();
}


macro
"add_selection_to_ROI_manager [a]"
{ //Add current selection into ROI manager
    //If you don't have a selection before this function, you'll have an error
    run("Add Selection...", "stroke=magenta width=1 fill=none"); //Add the selection to overlay but doesn't open the ROI manager and doesn't show you the update on the ROI manager
}

function measure_background() { //Iterate through all ROI (background areas selected by the user)
    run("To ROI Manager");
    ROI_count = roiManager("count"); //Obtain the total number of ROI in the manager

    for (i = 0; i < ROI_count; i++) { //Iterate through all ROI
        //All the ROIs' names are in the format of "count-4digit" so the original order of ROIs is correct
        roiManager("Select", i); //Select each ROI by order

        roiManager("Rename", "Background_" + i + 1); //Rename because the original name has a random 4-digit number as part of it. i+1 because the index should start from 1 from a biological perspective
    }

    //print_array(ROI_array);

    selectROIsByRegex("^Background_.*");
    // roiManager("multi-measure measure_all"); // Measure all background ROI on all slices. Later after I used the smart_wait_for_user, somehow this line will pop out the multiple measure window, which is very annoying. I debugged in multiple ways, but still cannot figure out why. Like I can pause the code before this line, and run this line in the macro editor, and it doesn't trigger the window. Another function also run these 2 lines, but it doesn't trigger the window. I decided to bypass this issue using the for loop below which gives the same results

    stackSize = nSlices;   // nSlices can change during iterations so this is a safer way of iterating through slices
    for (i = 1; i <= stackSize; i++) {
        setSlice(i);

        roiManager("Measure");
    }
    //Measurements will go to the measurement table
}

function save_background_data() {
    image_name = get_stack_name();

    FileName = "background_data_for_" + image_name + ".csv";
    save_directory = judge_make_directory("Fiji_output\\Background_data");
    saveAs("Results", save_directory + "\\" + FileName);
}


function average_background() {

    // Initialize an array to store the "Mean" values where "Slice" = 1
    mean_slice_1 = newArray();
    mean_slice_2 = newArray();
    mean_slice_3 = newArray();

    for (row = 0; row < nResults; row++) { // Loop through the rows in the Results Table
        label = getResultLabel(row);

        if ((matches(label, ".*LactC2$"))) {
            mean_slice_1 = append_to_array(mean_slice_1, getResult("Mean", row));
        } else if ((matches(label, ".*Actin$"))) {
            mean_slice_2 = append_to_array(mean_slice_2, getResult("Mean", row));
        } else if ((matches(label, ".*DAPI$"))) {
            mean_slice_3 = append_to_array(mean_slice_3, getResult("Mean", row));
        } else {
            print("Nothing found");
        }

    }

    avg_background_slice_1 = average_array_num(mean_slice_1);
    avg_background_slice_2 = average_array_num(mean_slice_2);
    avg_background_slice_3 = average_array_num(mean_slice_3);


    return newArray(avg_background_slice_1, avg_background_slice_2, avg_background_slice_3); //ImageJ script language doesn't have something similar to dict
}

function subtract_background(input_avg_background_array) {
    for (i = 1; i < nSlices + 1; i++) { //Iterate all slices
        setSlice(i);
        run("Subtract...", "value=" + input_avg_background_array[i - 1] + " slice"); //The slice option limits the changes to that specific slice
        //The index for the array uses [i - 1] here because the array indexes start from 0 but the indexes for slices in a stack start from 1
    }
}

function force_close_roi_manager() {
    //Close ROI manager without that annoying window pop out
    roiManager("reset"); //Clean up ROI manager such that when you close the manager in the next line, there's no pop out window
    close("ROI Manager");
}

macro
"clean_background [c]"
{
    setTool("rectangle"); //Change the selection tool to rectangle which is the most commonly used tool for selecting the background
    smart_wait_for_user("Add rectangle selection(s) for background with shortcut key [a].\n", 100, 2, 100);

    measure_background();

    save_background_data();

    avg_background = average_background();

    run("Select None"); //This deselect anything on the images. Without this line, the next line of subtracting the background will only occur within the last ROI

    subtract_background(avg_background);

    force_close_roi_manager();

    //The Results table and the Log are for debugging. Normally I don't need to see them since after the background subtraction, I can tell it's successful by seeing lots of 0-value pixels in the background
    close("Results");
    close("Log");
}


// Functions for area defining
macro
"define_whole_cell_area [x]"
{
    roiManager("reset"); // Just in case if any background ROI are remained
    close("ROI Manager"); // Resetting ROI manager will open the ROI manager and this just closes it

    setSlice(2);

    setTool("freehand");

    smart_wait_for_user("Trace out the whole cell.\n", 100, 2, 100);

    run("Add Selection...", "stroke=red width=1 fill=none"); //Add the traced cell to overlay so user can see it when tracing the splitting line.

    // User don't need to press [a] here since you only have 1 whole_cell area

    // save_selection_as_ROI("whole_cell"); // Don't save it now since the splitting lines will be added to the overlay and will be added to ROI altogether
}


macro
"define_lines_splitting_out_ruffles [y]"
{
    setTool("freeline");
    smart_wait_for_user("Trace out the lines splitting out ruffles with shortcut key [a].\nPlease ensure the 2 ends of the lines are outside of the cell area.\n", 100, 3, 100);
}

// Functions for ROI splitting
function find_whole_cell_and_line_ruffles_raw() {
    roi_count = roiManager("Count");
    if (roi_count == 0) {
        return;
    } else {
        max_area = 0;
        line_ruffles_counter = 0;

        for (i = 0; i < roi_count; i++) {
            roiManager("Select", i);
            getStatistics(area, mean, min, max, std); // This measure the area of the ROI and store it in the variable area

            if (area <= max_area) {
                roiManager("Rename", "line_ruffles_raw_" + line_ruffles_counter);
                line_ruffles_counter++;
            } else {
                max_area = area;

                roiManager("Rename", "whole_cell");
            }
        }
    }
}

function turn_line_ruffles_raw_into_shape() {
    all_line_ruffles_raw_idx_array = selectROIsByRegex("^line_ruffles_raw_.*");

    for (i = 0; i < all_line_ruffles_raw_idx_array.length; i++) {
        line_ruffles_raw_idx = all_line_ruffles_raw_idx_array[i];
        roiManager("Select", line_ruffles_raw_idx);

        roi_name = Roi.getName();
        parts = split(roi_name, "_");
        line_ruffles_idx_in_name = parts[parts.length - 1];

        Roi.setStrokeWidth(1); // This makes the line's width to be a given value.

        run("Line to Area"); // This makes a shape or an area that surrounds the original 1 px wide line
        // Although you can directly do logic operations with between lines and shapes (lines will be automatically converted to areas), using this code to explicitly convert a line to area gives you more control

        save_selection_as_ROI("line_ruffles_raw_area_" + line_ruffles_idx_in_name);
    }
}

function bridge_diagonal_only_contacts() { // Adds pixels to convert 8-connectivity corner touches into 4-connected bridges
    // This is different from dilation, which adds a certain amount of pixels on all 4 directions of a white pixel
    // Running this function on the same mask multiple time won't make the area thicker and thicker--it only connect the pixels once and that's it

    // Technically, you can use a 2 by 2 matrix to judge but ImageJ native matrix calculation requires matrix to be 3 by 3 at minimum. Using a 2 by 2 matrix is possible but that involves move the image around and that just complicates things

    run("8-bit");
    setForegroundColor(255, 255, 255); //White
    setBackgroundColor(0, 0, 0); // Black

    getDimensions(width, height, c, z, t);

    // In ImageJ's mask view, the coordinate's origin is in the top left corner
    // Your right is X+ and left is X-
    // You up is Y- and down is Y+

    // Collect bridging pixels first (so we don't affect detection mid-scan). Native imageJ macro language doesn't have nested arrays
    xs = newArray();
    ys = newArray();
    n = 0;

    // Helper to read pixel quickly
    function P(x, y) {
        return getPixel(x, y);
    }

    // These are flickers. Since for the 2 situations that need a pixel to be filled in, each has 2 ways, I used the 2 flickers below to flip such that the 2 ways of filling in are alternated for a more even result
    right_up_add_pixel_label = "right"; // Alterates between "right" and "up"
    right_down_add_pixel_label = "right"; // Alterates between "right" and "down"

    for (y = 1; y < height - 1; y++) {
        for (x = 1; x < width - 1; x++) {

            if (P(x, y) != 255) { // Current pixel is black, skip
                continue;
            } else {
                right = x + 1;
                left = x - 1;
                up = y - 1;
                down = y + 1;

                up_pixel = P(x, up);
                down_pixel = P(x, down);
                left_pixel = P(left, y);
                right_pixel = P(right, y);

                right_up_pixel = P(right, up);
                right_down_pixel = P(right, down);
                left_up_pixel = P(left, up);
                left_down_pixel = P(left, down);

                if (right_up_pixel == 255 && right_pixel == 0 && up_pixel == 0) { // right_up_pixel is white and connected by the right up corner
                    // You can fill in the right_pixel || up_pixel || both

                    if (right_up_add_pixel_label == "right") {
                        xs[n] = right;
                        ys[n] = y;
                        n++;

                        right_up_add_pixel_label = "up";

                    } else if (right_up_add_pixel_label == "up") {
                        xs[n] = x;
                        ys[n] = up;
                        n++;

                        right_up_add_pixel_label = "right";

                    } else {
                        print("right_up_add_pixel_label has unexpected value!");
                        return;
                    }
                }

                // The check below is not necessary since right_up_pixel and left_down_pixel are on the same diagonal direction. This can save time
                // if (left_down_pixel == 255 && left_pixel == 0 && down_pixel == 0) { // left_down_pixel is white and connected by the left down corner
                //     // You can fill in the left_pixel || down_pixel || both
                //
                //     xs = Array.concat(xs, newArray(left));
                //     ys = Array.concat(ys, newArray(y));
                //     n++;
                // }

                if (right_down_pixel == 255 && right_pixel == 0 && down_pixel == 0) { // right_down_pixel is white and connected by the right down corner
                    // You can fill in the right_pixel || down_pixel || both

                    if (right_down_add_pixel_label == "right") {
                        xs[n] = right;
                        ys[n] = y;
                        n++;

                        right_down_add_pixel_label = "down";

                    } else if (right_down_add_pixel_label == "down") {
                        xs[n] = x;
                        ys[n] = down;
                        n++;

                        right_down_add_pixel_label = "right";

                    } else {
                        print("right_down_add_pixel_label has unexpected value!");
                        return;
                    }
                }

                // The check below is not necessary since right_down_pixel and left_up_pixel are on the same diagonal direction. This can save time
                // if (left_up_pixel == 255 && left_pixel == 0 && up_pixel == 0) { // left_up_pixel is white and connected by the left up corner
                //     // You can fill in the left_pixel || up_pixel || both
                //
                //     xs = Array.concat(xs, newArray(left));
                //     ys = Array.concat(ys, newArray(y));
                //     n++;
                // }
            }
        }
    }

    for (i = 0; i < n; i++) { // Write all bridge pixels. You can also use xs and ys to first fill in all the additional pixels on a blank black new mask and do an OR with the original mask to speed up. I'm fine with the current speed using this simple for loop
        setPixel(xs[i], ys[i], 255);
    }
}

function truncate_line_ruffles_raw_area_by_whole_cell() { // This turns line_ruffles_raw_area to line_ruffles_area, aka trim off the parts that are outside the whole_cell area
    roi_count = roiManager("count");
    for (i = 0; i < roi_count; i++) {
        roiManager("Select", i);
        roi_name = Roi.getName();

        if (matches(roi_name, "^line_ruffles_raw_area_.*")) {
            selectROIsByRegex("^(whole_cell|" + roi_name + ")$");

            roiManager("AND"); //After this line, the selection should be the cut version of the line_ruffles_raw_area, aka the line_ruffles_area. However, this shape is usually a composite.
            // Doing AND before adding in the bridging pixel is better than reverse since the latter will waste any bridging pixels that are outside the cell and it still needs another mask-selection conversion to avoid it being a composite ROI

            // Lines below convert a selected composite ROI into a single ROI by making a mask and then use that mask to make back a selection
            run("Create Mask"); // This pop out a mask window

            bridge_diagonal_only_contacts(); // This is a critical step where it helps solve the small tail issues by filling in 1 pixel between 2 pixels that are only connected on a corner to make all the pixels are connected by a side

            run("Create Selection");

            parts = split(roi_name, "_");
            line_ruffles_raw_area_idx_in_name = parts[parts.length - 1];

            save_selection_as_ROI("line_ruffles_area_" + line_ruffles_raw_area_idx_in_name);

            close("Mask"); // Close the mask window
        }
    }
}


function split_whole_cell_area_with_line_ruffles_area() {
    selectROIsByRegex("^(whole_cell|line_ruffles_area_.*)$"); // This select the ROI named "whole_cell" and the ones started with "line_ruffles_area_"
    roiManager("XOR");
    roiManager("Split");

    roi_count = roiManager("count");

    // After a split, some of the resulting ROI are actually a composite selection (this adds a small tail on the non_ruffles and ruffles areas), so I added one more check on each of the roi
    for (i = 0; i < roi_count; i++) {
        roiManager("Select", i);
        roi_name = Roi.getName();

        if (matches(roi_name, "^0.*")) {
            if (current_composite_selection() == true) {
                roiManager("Split");
            } else {
            }
        }
    }

    roiManager("Show None"); // This just means to only show the ROI being selected, not all of them
}


function find_non_ruffle_roi_from_split(idxes_roi_from_split) {
    // The non-ruffle area has the largest area from the split. This will also make it easier later if you want to have multiple ruffles since you can just do XOR between the cell body and the non-ruffle area

    if (idxes_roi_from_split.length == 0) {
        return;
    } else {
        max_area = 0;
        max_area_idx = 0;

        for (i = 0; i < idxes_roi_from_split.length; i++) {
            roiManager("Select", idxes_roi_from_split[i]);
            getStatistics(area, mean, min, max, std); // This measure the area of the ROI and store it in the variable area

            if (area <= max_area) {

            } else {
                max_area = area;
                max_area_idx = i;
            }
        }

        // Rename the found non-ruffle area
        roiManager("Select", idxes_roi_from_split[max_area_idx]);
        save_selection_as_ROI("non_ruffles"); // This makes a duplication of the biigest ROI from split since all the sub ROI generated from the split will be deleted by the code below


        // Iterate through all the ROI in the manager and delete all the remaining ROI from split
        roi_count = roiManager("Count");
        for (i = roi_count - 1; i >= 0; i--) {

            roiManager("Select", i);
            roi_name = Roi.getName();

            if (matches(roi_name, "^0.*")) {
                roiManager("Delete");
            }
        }
    }
}

function current_composite_selection() {
    selection_type = selectionType();  // -1 if none
    if (selection_type == 9) { // 9 is composite
        return true;
    } else {
        return false;
    }
}

function subtract_whole_cell_by_non_ruffles() {
    selectROIsByRegex("^(whole_cell|non_ruffles)$");

    roiManager("XOR");

    if (current_composite_selection() == true) { // This is when you have multiple ruffles areas
        roiManager("Split");

        roi_count = roiManager("count");

        ruffles_idx = 0;
        for (i = 0; i < roi_count; i++) {
            roiManager("Select", i);
            roi_name = Roi.getName();


            if (matches(roi_name, "^0.*")) {
                getStatistics(area, mean, min, max, std); // Use the area to filter out the real ruffles area
                area_threshold = 0.1; // Those noisy tails will be very small and this threshold can be determined by measurement

                if (area >= area_threshold) {
                    roiManager("Rename", "ruffles_" + ruffles_idx);

                    ruffles_idx++;
                }

            }
        }
    } else {
        save_selection_as_ROI("ruffles_0"); // This is the only 1 ruffles area
    }

    indices = selectROIsByRegex("^0.*");
    if (indices.length > 0) {
        roiManager("Delete");
    } else { // When there's no ROI whose name starts with "0", the last ROI will be selected. If you directly delete, that last ROI will be deleted, even its name doesn't start with "0"
        roiManager("Deselect");
    }
}

macro
"split_cell_area_by_line_ruffles [s]"
{
    run("To ROI Manager"); // Now ROI for whole_cell and all the line_ruffles should be added to the ROI manager
    roiManager("Show All without labels");


    // Use whole_cell to cut line_ruffles_raw to get line_ruffles
    find_whole_cell_and_line_ruffles_raw();
    turn_line_ruffles_raw_into_shape(); // Now you have line_ruffles_raw_area
    truncate_line_ruffles_raw_area_by_whole_cell(); // This turns line_ruffles_raw_area to line_ruffles_area


    // Use line_ruflles_area to split whole_cell
    split_whole_cell_area_with_line_ruffles_area();

    idxes_roi_from_split = selectROIsByRegex("^0.*"); // All sub ROI from the split will have a name starting with 0 (if more later, I guess it'll just be a number but for the purpose of, this is enough). This array contains all the ROI from the split
    find_non_ruffle_roi_from_split(idxes_roi_from_split);

    subtract_whole_cell_by_non_ruffles();

    save_all_roi();
}


macro
"measure_intensities_on_all_channels [m]"
{
    // Each one of them is select first and then move channel. If you move channel first, the measurement will occur on back on the channel the ROI was defined
    selectROIsByRegex("^(whole_cell||non_ruffles|ruffles_.*)$");
    roiManager("multi-measure measure_all");
}

macro
"save_measurements [o]"
{
    filename_img = get_stack_name();
    filename_csv = "measurements_for_" + filename_img + ".csv";
    save_directory = judge_make_directory("Fiji_output\\measurements");
    saveAs("Results", save_directory + "\\" + filename_csv);

    close("Results");
}

macro
"save_overlaid_img [i]"
{
    // After this step, the ROI stack info will be lost so you have to do the measurements before this step
    selectROIsByRegex("^(whole_cell|line_ruffles_raw_.*|line_ruffles_raw_area_.*|line_ruffles_area_.*)$");
    roiManager("Delete"); // Now you should have only "ruffles" and "non-ruffles"

    // Change the color for the ROI you want to overlay. Overlay will happen on the red and green channel so avoid those 2 colors
    roiManager("Deselect");
    selectROIsByRegex("^non_ruffles$");
    roiManager("Set Color", "cyan");

    roiManager("Deselect");
    selectROIsByRegex("^ruffles_.*$");
    roiManager("Set Color", "yellow");


    original_stack_window = getTitle();
    for (i = 1; i < nSlices + 1; i++) {
        if (i <= 2) { // I only want the overlay image for the 1st 2 slices
            selectWindow(original_stack_window); // Ensure you always go back to the original image stack. This is a 2nd protection the in addition to the close() in the end of the loop

            slice_name = getInfo("slice.label"); // slice_name will also contain the stack name here. This need to happen before the run("Flatten", "slice");

            // selectROIsByRegex("^ruffles$"); // Somehow you cannot select here (you actually don't need to). If you select here, somehow the code will take the slice back to the slice where ROI "ruffles" was defined and made the flattening there
            roiManager("Show All without labels"); // My labels are "ruffles" and "non_ruffles". Choose not to label ROI on the overlay since the locations are a bit off with such long string labels
            // If later you want to have more control on the overlay, you can select an ROI, run("Add Selection...");, keep doing these until you finish adding all the ROI to overlay, and then run("Flatten", "slice");

            selectROIsByRegex("^(^non_ruffles$|^ruffles_.*$)$"); // You need to select first and then setSlice, since the selection will take you back to the slice that the ROI are defined
            setSlice(i);

            run("Flatten", "slice");

            rename("split_overlaid_" + slice_name); // This renames the overlaid image
            run("Set Label...", "label=[" + slice_name + "_split_overlaid]"); // However, that overlaid image also has a slice and the name needs to be corrected

            stack_title = get_stack_name();
            save_directory = judge_make_directory("Fiji_output\\ROI_overlay");

            saveAs("Jpeg", save_directory + "\\" + stack_title + ".jpg");
            saveAs("Tiff", save_directory + "\\" + stack_title + ".tif");
            // saveAs("PNG", save_directory + "\\" + stack_title + ".png");

            close();
        }
    }
}

function save_processed_stack() {
    run("Select None"); // Clear any selection currently on the image, so it doesn't get saved into the processed_stack.tiff

    filename_stack = get_stack_name();
    save_directory = judge_make_directory("Fiji_output\\processed_stack");
    saveAs("Tiff", save_directory + "\\" + filename_stack + "_processed.tif");
}

macro
"finish_up [f]"
{
    save_processed_stack();

    roiManager("Reset");

    close("ROI Manager");

    close(); // This should close the current opened stack
}

macro
"auto_everything [z]"
{
    run("setup_output_folder [u]");

    run("display_and_slice_renaming [d]");

    run("clean_background [c]");

    run("define_whole_cell_area [x]");

    run("define_lines_splitting_out_ruffles [y]");

    run("split_cell_area_by_line_ruffles [s]");

    run("measure_intensities_on_all_channels [m]");

    run("save_measurements [o]");

    run("save_overlaid_img [i]");

    run("finish_up [f]");
}