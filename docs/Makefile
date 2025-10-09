# Makefile for compiling Typst documents

# Find all .typ files in the current directory
TYP_FILES := $(wildcard *.typ)
PDF_FILES := $(TYP_FILES:.typ=.pdf)

.PHONY: all clean

all: $(PDF_FILES)

%.pdf: %.typ
	typst compile $<

clean:
	rm -f *.pdf
