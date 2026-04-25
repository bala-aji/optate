import React, { useState, useEffect } from 'react';
import { useSelection } from '@/lib/selection-context';
import { changeTracker } from '@/lib/change-tracker';
import { Label } from '@/components/ui/Label';
import { Input } from '@/components/ui/Input';
import { ImageIcon, Link as LinkIcon, Upload } from 'lucide-react';

export const ImageSwapperPanel: React.FC = () => {
  const { selectedElement } = useSelection();
  const [src, setSrc] = useState('');
  const [isImage, setIsImage] = useState(false);

  useEffect(() => {
    if (selectedElement) {
      if (selectedElement.tagName.toLowerCase() === 'img') {
        setSrc((selectedElement as HTMLImageElement).src);
        setIsImage(true);
      } else {
        const bg = window.getComputedStyle(selectedElement).backgroundImage;
        if (bg && bg !== 'none') {
          const match = bg.match(/url\("?(.+?)"?\)/);
          if (match) setSrc(match[1]);
          setIsImage(true);
        } else {
          setSrc('');
          setIsImage(false);
        }
      }
    }
  }, [selectedElement]);

  if (!selectedElement) return null;

  const handleSrcChange = (newSrc: string) => {
    if (selectedElement.tagName.toLowerCase() === 'img') {
      const oldSrc = (selectedElement as HTMLImageElement).src;
      (selectedElement as HTMLImageElement).src = newSrc;
      setSrc(newSrc);
      changeTracker.recordChange(selectedElement, 'image', 'src', oldSrc, newSrc);
    } else {
      const oldBg = window.getComputedStyle(selectedElement).backgroundImage;
      selectedElement.style.backgroundImage = `url("${newSrc}")`;
      setSrc(newSrc);
      changeTracker.recordChange(selectedElement, 'image', 'backgroundImage', oldBg, `url("${newSrc}")`);
    }
  };

  return (
    <div className="optate-space-y-6">
      {!isImage ? (
        <div className="optate-p-6 optate-bg-earth-loam/20 optate-border optate-border-earth-loam optate-rounded-lg optate-flex optate-flex-col optate-items-center optate-text-center optate-gap-2">
           <ImageIcon size={24} className="optate-text-earth-clay/50" />
           <p className="optate-text-xs optate-text-earth-clay">Select an image element or an element with a background image to swap it.</p>
        </div>
      ) : (
        <>
          <div className="optate-space-y-4">
            <div className="optate-aspect-video optate-bg-earth-loam/20 optate-rounded-lg optate-border optate-border-earth-loam optate-overflow-hidden optate-flex optate-items-center optate-justify-center">
               <img src={src} className="optate-max-w-full optate-max-h-full optate-object-contain" alt="Preview" />
            </div>

            <div className="optate-space-y-2">
               <Label>Image URL</Label>
               <div className="optate-flex optate-gap-2">
                  <Input 
                    value={src} 
                    onChange={(e) => setSrc(e.target.value)}
                    className="optate-flex-1"
                    placeholder="https://..."
                  />
                  <button 
                    onClick={() => handleSrcChange(src)}
                    className="optate-bg-earth-terracotta optate-text-white optate-px-3 optate-rounded-md optate-text-xs optate-font-bold optate-hover:bg-earth-terracotta-light"
                  >
                    Apply
                  </button>
               </div>
            </div>

            <div className="optate-pt-4 optate-border-t optate-border-earth-loam">
               <div className="optate-flex optate-flex-col optate-gap-2">
                  <button className="optate-w-full optate-py-2 optate-bg-earth-loam/30 optate-border optate-border-earth-loam optate-rounded-md optate-text-[10px] optate-text-earth-clay optate-uppercase optate-font-bold optate-tracking-wider optate-flex optate-items-center optate-justify-center optate-gap-2 optate-hover:bg-earth-loam">
                    <Upload size={14} />
                    Upload Image
                  </button>
               </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
