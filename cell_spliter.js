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

    if (indexOf(stack_name, " ") != -1) {
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

    stack_title = get_stack_name();
    save_directory = judge_make_directory("Fiji_output\\ROI");
    roiManager("Save", save_directory + "\\" + stack_title + "_" + ROI_name + ".zip"); //Save as a .zip rather than a .roi here since importing .zip to ImageJ will put things into the ROI manager, while importing .roi will simply make the selection again without adding anything to the ROI manager

}

function selectROIsByNames(nameArray) {
    roi_count = roiManager("Count");
    indices = newArray();
    indices_counter = 0;

    for (i = 0; i < roi_count; i++) {
        roiManager("Select", i);
        roi_name = Roi.getName();

        for (j = 0; j < nameArray.length; j++) {
            if (matches(roi_name, nameArray[j])) {
                indices[indices_counter] = i;
                indices_counter++;
            }
        }
    }
    if (indices.length > 0) {

        roiManager("Select", indices); // multi-select
    }
}

function selectROIByName(roi_name_to_select) {
    roi_count = roiManager("Count");     // returns array of ROI names
    for (i = 0; i < roi_count; i++) {
        roiManager("Select", i);
        roi_name = Roi.getName();

        if (matches(roi_name, roi_name_to_select)) {
            return i; // return the index if found
        }
    }
    exit("ROI named '" + roi_name_to_select + "' not found.");
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

macro
"setup_output_folder [u]"
{
    judge_make_directory("Fiji_output"); //Judge whether the desktop has a "Fiji_output" and if not, make that folder
    //If the folder is already there, nothing will happen
}

// Automatic functions
function rename_slices() {
    filename = get_stack_name();

    //1st slice is the 405 nm image
    setSlice(1);
    run("Set Label...", "label=[" + filename + "_LactC2]");

    //2nd slice is the 488 nm image
    setSlice(2);
    run("Set Label...", "label=[" + filename + "_Actin]");

    //3rd slice is the brightfield image
    if (nSlices > 2) { //This means you have a brightfield image in the stack
        setSlice(3);
        run("Set Label...", "label=[" + filename + "_DAPI]");
    }
}

macro
"display_and_slice_renaming [d]"
{
    rename_slices();
    setSlice(2); //Go back to the 2nd slice for the actin image, which will be used to define cell areas
}


// Functions for area defining
macro
"define_whole_cell_area [x]"
{
    setTool("freehand");
    waitForUser("Trace out the whole cell and hit OK");

    run("Add Selection...", "stroke=red width=1 fill=none"); //Add the traced cell to overlay so user can see it when tracing the splitting line
    save_selection_as_ROI("whole_cell");
}


macro
"define_line_spliting_out_ruffles [y]"
{
    setTool("freeline");
    waitForUser("Trace out the line splitting out ruffles (please ensure the 2 ends of the lines are outside of the cell area) and hit OK");

    run("Remove Overlay"); // This is necessary so the whole cell area doesn't add together with the line
    save_selection_as_ROI("line_ruffles");
}

// Functions for ROI splitting
function turn_line_ruffles_into_shape() {
    selectROIByName("line_ruffles");

    Roi.setStrokeWidth(1); // This makes the line's width to be 1 px
    run("Line to Area"); // This makes a shape or an area that surrounds the original 1 px wide line
    save_selection_as_ROI("line_ruffles_area");
}

function split_whole_cell_area_with_line_ruffles() {
    selectROIsByNames(newArray("whole_cell", "line_ruffles_area"));
    roiManager("XOR");
}

function extract_roi_from_split() {
    // Iterate through the ROI list and found the ones that are from the split (their name start with 0)

    roi_count = roiManager("Count");
    indices = newArray();
    indices_counter = 0;

    for (i = 0; i < roi_count; i++) {
        roiManager("Select", i);
        roi_name = Roi.getName();

        // print(roi_name);
        if (matches(roi_name, "^0.*")) { // All sub ROI from the split will have a name starting with 0 (if more later, I guess it'll just be a number but for the purpose of )
            indices[indices_counter] = i;

            indices_counter++;
        }

    }

    return indices; // This array contains all the ROI from the split
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
        roiManager("Rename", "non_ruffles");
        save_selection_as_ROI("non_ruffles");


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

function subtract_whole_cell_by_non_ruffles() {
    selectROIsByNames(newArray("whole_cell", "non_ruffles"));

    roiManager("XOR");

    save_selection_as_ROI("ruffles");
}

macro
"split_cell_area_by_line_ruffles [s]"
{
    turn_line_ruffles_into_shape();
    split_whole_cell_area_with_line_ruffles();

    roiManager("Split");

    idxes_roi_from_split = extract_roi_from_split();
    find_non_ruffle_roi_from_split(idxes_roi_from_split);

    subtract_whole_cell_by_non_ruffles();
}


macro
"measure_intensities_on_first_channel [m]"
{
    // Each one of them is select first and then move channel. If you move channel first, the measurement will occur on back on the channel the ROI was defined
    selectROIByName("whole_cell");
    run("Measure"); // Measure on the 2nd channel
    setSlice(1); // Go back to 1st channel
    run("Measure"); // Measure on the 1st channel

    selectROIByName("non_ruffles");
    run("Measure");
    setSlice(1);
    run("Measure");

    selectROIByName("ruffles");
    run("Measure");
    setSlice(1);
    run("Measure");
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
    // After this step, the ROI stack info will be lost so you have to do the measurements before thsi step
    setSlice(1); // Go to the 2nd channel for overlay since it's where the ROI are defined

    selectROIsByNames(newArray("whole_cell", "line_ruffles", "line_ruffles_area"));
    roiManager("Delete"); // Now you should have only "ruffles" and "non-ruffles"

    selectROIByName("ruffles");
    roiManager("Show All");
    run("Flatten", "slice");

    old_stack_title = get_stack_name();
    rename("split_overlay_on_definiation_channel" + old_stack_title + ".jpg");
    stack_title = get_stack_name();
    save_directory = judge_make_directory("Fiji_output\\ROI_overlay");
    saveAs("Jpeg", save_directory + "\\" + stack_title + ".jpg");
    close();
}

macro
"clean_things_up_for_next [c]"
{
    roiManager("Reset");

    close("ROI Manager");

    close(); // This should close the current opened stack
}

macro
"auto_everything [z]"
{
    run("setup_output_folder [u]");

    run("display_and_slice_renaming [d]");

    run("define_whole_cell_area [x]");

    run("define_line_spliting_out_ruffles [y]");

    run("split_cell_area_by_line_ruffles [s]");

    run("measure_intensities_on_first_channel [m]");

    run("save_measurements [o]");

    run("save_overlaid_img [i]");

    run("clean_things_up_for_next [c]");

}