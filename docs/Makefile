# Makefile for compiling Typst documents

# Find all .typ files in the current directory
TYP_FILES := $(wildcard *.typ)
PDF_FILES := $(TYP_FILES:.typ=.pdf)

.PHONY: all clean

all: $(PDF_FILES)

%.pdf: %.typ
	typst compile $<

instructions.pdf: mnist-instructions.pdf poker-instructions.pdf
	pdfjam --fitpaper true --outfile instructions.pdf mnist-instructions.pdf poker-instructions.pdf

clean:
	rm -f *.pdf
