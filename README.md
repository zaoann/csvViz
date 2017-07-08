# csvViz
An in-browser general csv dataset visualizer by plotting bubble plots that interactively applies cross filter. Written in JavaScript using d3.js and its related libraries.

Demo Page: https://zaoann.github.io/csvViz

This is a proof of concept that's somewhat demo-able. There's a lot of bugs and issues, but I just haven't been able to justify investing more time into it after it reached this stage.

To use:

download the sample csv file, open it, the coverpage will slide up revealing a summary stats page on top and 4 input bars below it to specify which variables go to which axis.

If it recognizes the sample file name, there'll be some default input so that you can click the "Draw" button directly; if not, variables can be entered by clicking buttons in the "Column Name" column, and simple formulas can be entered by typing (I've written a formula parser from scratch, more on this later.).

This page will slides up after clicking on "Draw" revealing the final page of a series of bubble plots, one for each column variable.

Each bubble represents a distinct value (or a range of values if the number of distinct values > some threshold, maybe 100), this distinct value (or average within the range) is shown as the number centered at each bubble.

The position/radius/colour of the bubbles are calculated according to the axis variables specified in the previous page.

Clicking on any bubble will apply filter on all plots, with only sample points that fall in the bubble drew. E.g. clicking on the "7" and "8" bubbles in the last "quality" plot will result in all other plots plotting only quality = "7" or "8" samples.

One can go back to previous pages by clicking on the coloured bar on top, and re-specify axis, or reopen files... though I don't remember it working too well... So to redraw or try other files, just reload the whole page.
